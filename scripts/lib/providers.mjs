// TIVRA News — AI provider pool.
// Every provider speaks the OpenAI-compatible /chat/completions format, so
// swapping models or providers is a config edit (config/news-config.json),
// never a code change. Providers with no API key in the environment are
// skipped; a provider that rate-limits or errors is put on cooldown and the
// pool rotates to the next one. If every provider is down the caller skips
// that story — it retries naturally on the next scheduled run.

const COOLDOWN_MS = 90_000;

export class ProviderPool {
  constructor(providerConfigs, communityConfig = null) {
    this.providers = (providerConfigs || [])
      .map((p) => {
        const rpm = p.rpm || 10;
        return {
          ...p,
          apiKey: (process.env[p.envKey] || "").trim(),
          rpm,
          minIntervalMs: Math.ceil(60_000 / rpm),
          lastCallTime: 0,
          cooldownUntil: 0,
          ok: 0,
          failed: 0,
        };
      })
      .filter((p) => p.apiKey);
    this.communityConfig = communityConfig;
    this.cursor = 0;
  }

  /**
   * Pure logic dynamic verification & tiered wiring of Pollinations community models:
   * Tier 1: Capable high-parameter models (GPT-4o, Gemini 2.5 Pro, Flash, DeepSeek, Nemotron, LLM7)
   * Tier 2: Companion fallback models (Osaii, Laguna, Grok, Kilo, Cohere, etc.)
   * Tier 3: External free providers (OpenRouter 120B/Gemma, Gemini, Groq)
   */
  async initDynamicCommunityModels() {
    if (!this.communityConfig) return;
    const envKey = this.communityConfig.envKey || "POLLINATIONS_API_KEY";
    const apiKey = (process.env[envKey] || "").trim();
    const baseUrl = this.communityConfig.baseUrl || "https://gen.pollinations.ai/v1";
    const capableConfigs = this.communityConfig.capableModels || [];
    const fallbackConfigs = this.communityConfig.fallbackModels || [];

    console.log(`[Providers] Pre-flight checking Pollinations community models at ${baseUrl}...`);

    // 1. Fetch live active catalog from gen.pollinations.ai (both main and community) to audit pricing
    const catalogMap = new Map();
    let dynamicFreeCommunity = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const [resMain, resComm] = await Promise.all([
        fetch(`https://gen.pollinations.ai/models`, { signal: controller.signal }).catch(() => null),
        fetch(`https://gen.pollinations.ai/models?community=true&reliability=all`, { signal: controller.signal }).catch(() => null),
      ]);
      clearTimeout(timeoutId);

      const allModels = [];
      if (resMain && resMain.ok) {
        const d1 = await resMain.json();
        allModels.push(...(Array.isArray(d1) ? d1 : (d1.data || [])));
      }
      if (resComm && resComm.ok) {
        const d2 = await resComm.json();
        allModels.push(...(Array.isArray(d2) ? d2 : (d2.data || [])));
      }

      for (const m of allModels) {
        const id = m.name || m.id;
        if (id && !catalogMap.has(id)) catalogMap.set(id, m);
        if (m.aliases) {
          for (const a of m.aliases) {
            if (!catalogMap.has(a)) catalogMap.set(a, m);
          }
        }
      }

      // Helper: Mathematical zero-cost check
      this.isZeroCostModel = (modelId) => {
        const meta = catalogMap.get(modelId);
        if (!meta) return false;
        if (meta.category !== "text") return false;
        if (meta.paid_only === true) return false;
        const pIn = parseFloat(meta.pricing?.promptTextTokens || "0");
        const pOut = parseFloat(meta.pricing?.completionTextTokens || "0");
        if (pIn > 0 || pOut > 0) return false; // STRICT REJECTION OF METERED MODELS
        const status = meta.health?.status || "unknown";
        const rate = typeof meta.health?.success_rate === "number" ? meta.health.success_rate : 0;
        return status !== "down" && rate >= 75;
      };

      dynamicFreeCommunity = allModels.filter((m) => {
        const id = m.name || m.id;
        return this.isZeroCostModel(id);
      });
      console.log(`[Providers] Audited ${catalogMap.size} Pollinations models (${dynamicFreeCommunity.length} verified zero-price community models).`);
    } catch (err) {
      console.warn(`[Providers] Could not reach Pollinations live catalog: ${err.message}.`);
      this.isZeroCostModel = () => false; // Safe default: never assume a model is free without catalog proof
    }

    // 2. Discover live free models from OpenRouter dynamically
    try {
      const orRes = await fetch("https://openrouter.ai/api/v1/models");
      if (orRes.ok) {
        const orData = await orRes.json();
        const orFree = (orData.data || []).filter((m) => m.id && m.id.endsWith(":free"));
        const orKey = (process.env.OPENROUTER_API_KEY || "").trim();
        if (orKey && orFree.length > 0) {
          const orProviders = orFree.slice(0, 5).map((m) => ({
            name: `openrouter-${m.id.split("/")[1] || m.id}`,
            baseUrl: "https://openrouter.ai/api/v1",
            model: m.id,
            apiKey: orKey,
            tier: "primary-free",
            rpm: 15,
            minIntervalMs: 4000,
            lastCallTime: 0,
            cooldownUntil: 0,
            ok: 0,
            failed: 0,
          }));
          this.providers = [...orProviders, ...this.providers];
          console.log(`[Providers] Wired ${orProviders.length} dynamic free OpenRouter models.`);
        }
      }
    } catch (err) {
      // Non-fatal fallback
    }

    // Tag existing primary providers
    for (const p of this.providers) {
      if (!p.tier) p.tier = "primary-free";
    }

    // 3. Filter candidate models strictly through zero-cost verification
    const zeroCostCapable = capableConfigs.filter((m) => {
      const isFree = this.isZeroCostModel ? this.isZeroCostModel(m.id) : false;
      if (!isFree) {
        console.warn(`  ⚠ [Zero-Cost Guard] Discarded Pollinations model ${m.id} — not verified 0 Pollen in catalog. Never charging balance.`);
      }
      return isFree;
    });

    const zeroCostFallback = fallbackConfigs.filter((m) => {
      const isFree = this.isZeroCostModel ? this.isZeroCostModel(m.id) : false;
      if (!isFree) {
        console.warn(`  ⚠ [Zero-Cost Guard] Discarded Pollinations fallback model ${m.id}. Never charging balance.`);
      }
      return isFree;
    });

    // 4. Pre-flight handshake ping on top zero-cost candidates
    let gatewayHealthy = false;
    let verifiedCandidate = null;
    const probeCandidates = zeroCostCapable.slice(0, 3);
    for (const candidate of probeCandidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: candidate.id,
            max_tokens: 16,
            messages: [{ role: "user", content: "hi" }],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.status === 200) {
          gatewayHealthy = true;
          verifiedCandidate = candidate;
          console.log(`  ✔ [Pollinations Pre-flight] Zero-cost handshake verified with ${candidate.id}.`);
          break;
        } else if (res.status === 402) {
          console.warn(`  ⚠ [Pollinations Pre-flight] Balance check flag (HTTP 402). Disabling Pollinations for this run.`);
          break;
        } else if (res.status === 401) {
          console.warn(`  ⚠ [Pollinations Pre-flight] Unauthorized (HTTP 401). Disabling Pollinations for this run.`);
          break;
        } else {
          console.warn(`  ⚠ [Pollinations Pre-flight] Candidate ${candidate.id} returned HTTP ${res.status}. Checking next...`);
        }
      } catch (err) {
        console.warn(`  ⚠ [Pollinations Pre-flight] Candidate ${candidate.id} timed out / error (${err.message}). Checking next...`);
      }
    }

    // 5. Wire ONLY verified zero-cost community models as secondary fallback
    if (gatewayHealthy) {
      const sortedCapable = verifiedCandidate
        ? [verifiedCandidate, ...zeroCostCapable.filter((m) => m.id !== verifiedCandidate.id)]
        : zeroCostCapable;

      const capableProviders = sortedCapable.map((m) => ({
        name: m.name || m.id,
        baseUrl,
        model: m.id,
        apiKey,
        tier: "community-zero-cost",
        rpm: m.rpm || 15,
        minIntervalMs: Math.ceil(60_000 / (m.rpm || 15)),
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      }));

      const fallbackProviders = zeroCostFallback.map((m) => ({
        name: m.name || m.id,
        baseUrl,
        model: m.id,
        apiKey,
        tier: "community-zero-cost",
        rpm: m.rpm || 15,
        minIntervalMs: Math.ceil(60_000 / (m.rpm || 15)),
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      }));

      // Append community zero-cost providers strictly AFTER primary free providers
      this.providers = [...this.providers, ...capableProviders, ...fallbackProviders];
      console.log(`[Providers] Successfully wired ${this.providers.length} zero-cost providers (Primary free prioritized first, Pollinations 0-Pollen secondary).`);
    } else {
      console.log(`[Providers] Operating strictly on primary zero-cost free providers.`);
    }
  }

  get available() {
    return this.providers.filter((p) => Date.now() >= p.cooldownUntil);
  }

  next() {
    const now = Date.now();
    const live = this.available;
    if (live.length === 0) return null;

    // Tier 1 Priority: Primary free providers (Gemini, OpenRouter, Groq)
    const primary = live.filter((p) => p.tier === "primary-free");
    for (let i = 0; i < primary.length; i++) {
      const idx = (this.cursor + i) % primary.length;
      const candidate = primary[idx];
      const elapsed = now - (candidate.lastCallTime || 0);
      if (elapsed >= (candidate.minIntervalMs || 0)) {
        this.cursor = (idx + 1) % primary.length;
        return candidate;
      }
    }

    // If primary providers are ready within 3 seconds, prefer waiting over secondary
    if (primary.length > 0) {
      const sortedPrimary = [...primary].sort((a, b) => {
        const waitA = (a.lastCallTime || 0) + (a.minIntervalMs || 0) - now;
        const waitB = (b.lastCallTime || 0) + (b.minIntervalMs || 0) - now;
        return waitA - waitB;
      });
      const bestWait = (sortedPrimary[0].lastCallTime || 0) + (sortedPrimary[0].minIntervalMs || 0) - now;
      if (bestWait <= 3000) {
        return sortedPrimary[0];
      }
    }

    // Tier 2: Community verified zero-cost models (Pollinations)
    const secondary = live.filter((p) => p.tier === "community-zero-cost");
    for (let i = 0; i < secondary.length; i++) {
      const candidate = secondary[i];
      const elapsed = now - (candidate.lastCallTime || 0);
      if (elapsed >= (candidate.minIntervalMs || 0)) {
        return candidate;
      }
    }

    // Fallback: Pick whichever ready provider has minimum remaining wait
    const sorted = [...live].sort((a, b) => {
      const waitA = (a.lastCallTime || 0) + (a.minIntervalMs || 0) - now;
      const waitB = (b.lastCallTime || 0) + (b.minIntervalMs || 0) - now;
      return waitA - waitB;
    });
    const p = sorted[0];
    this.cursor = (this.cursor + 1) % live.length;
    return p;
  }

  stats() {
    return this.providers.map((p) => `${p.name}: ${p.ok} ok / ${p.failed} failed`).join(", ");
  }

  async chat({ system, user, maxTokens = 3000, temperature = 0.8, attempts = 6 }) {
    let lastError = null;
    const maxAttempts = Math.max(attempts, this.providers.length);
    for (let i = 0; i < maxAttempts; i++) {
      const provider = this.next();
      if (!provider) break;
      try {
        // Enforce strict RPM tier pacing to prevent HTTP 429
        const now = Date.now();
        const waitMs = Math.max(0, ((provider.lastCallTime || 0) + (provider.minIntervalMs || 0)) - now);
        if (waitMs > 0 && waitMs <= 30_000) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        // Hard safety barrier: Never allow any metered Pollinations call
        if (provider.baseUrl.includes("pollinations.ai") && this.isZeroCostModel) {
          if (!this.isZeroCostModel(provider.model)) {
            console.error(`  ⛔ [CRITICAL SAFETY GUARD] Refusing to call metered Pollinations model ${provider.model}. Dropping permanently.`);
            provider.cooldownUntil = Infinity;
            continue;
          }
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 90_000);
        const isGoogle = provider.baseUrl.includes("generativelanguage.googleapis.com");
        const isTextPollinations = provider.baseUrl.includes("text.pollinations.ai");
        const url = isTextPollinations ? "https://text.pollinations.ai/" : `${provider.baseUrl}/chat/completions`;
        const headers = {
          "Content-Type": "application/json",
          ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        };
        if (isGoogle) {
          headers["x-goog-api-key"] = provider.apiKey;
        }
        if (provider.baseUrl.includes("openrouter.ai")) {
          headers["HTTP-Referer"] = "https://tivranews.com";
          headers["X-Title"] = "TIVRA News";
        }
        const bodyObj = {
          model: provider.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        };
        if (!isTextPollinations) {
          bodyObj.temperature = temperature;
          bodyObj.max_tokens = maxTokens;
        }
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify(bodyObj),
        }).finally(() => clearTimeout(timer));

        if (res.status === 429 || res.status >= 500) {
          const body = await res.text().catch(() => "");
          provider.cooldownUntil = Date.now() + COOLDOWN_MS;
          provider.failed++;
          lastError = new Error(`${provider.name} HTTP ${res.status}: ${body.slice(0, 150)}`);
          console.warn(`  ⚠ [${provider.name}] HTTP ${res.status}: ${body.slice(0, 150)}`);
          continue;
        }
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (res.status === 402 || /insufficient balance/i.test(body)) {
            provider.cooldownUntil = Infinity; // Permanently skip exhausted accounts for this run
            provider.failed++;
            lastError = new Error(`${provider.name} HTTP 402: Insufficient Balance`);
            console.warn(`  ⚠ [${provider.name}] HTTP 402: Account balance exhausted. Deactivated for this run.`);
            continue;
          }
          provider.cooldownUntil = Date.now() + COOLDOWN_MS;
          provider.failed++;
          lastError = new Error(`${provider.name} HTTP ${res.status}: ${body.slice(0, 150)}`);
          console.warn(`  ⚠ [${provider.name}] HTTP ${res.status}: ${body.slice(0, 150)}`);
          continue;
        }

        let text = "";
        if (isTextPollinations) {
          text = await res.text();
        } else {
          const data = await res.json();
          text = data?.choices?.[0]?.message?.content || "";
        }

        if (!text.trim()) {
          provider.failed++;
          lastError = new Error(`${provider.name} returned empty content`);
          console.warn(`  ⚠ [${provider.name}] Returned empty content`);
          continue;
        }
        provider.ok++;
        return { text, provider: provider.name };
      } catch (err) {
        provider.cooldownUntil = Date.now() + COOLDOWN_MS;
        provider.failed++;
        lastError = err;
        console.warn(`  ⚠ [${provider.name}] Error: ${err.message}`);
      }
    }
    throw lastError || new Error("No AI provider available (no API keys configured?)");
  }
}

// Repair truncated HTML by stripping trailing incomplete tag and closing open elements
export function repairHtml(html) {
  if (!html || typeof html !== "string") return "";
  let clean = html.replace(/<[^>]*$/, "").trim();
  const stack = [];
  const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*?)?(\/?)>/g;
  let match;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

  while ((match = tagRegex.exec(clean)) !== null) {
    const tag = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    const isSelfClosing = match[2] === "/" || voidTags.has(tag);
    if (isSelfClosing) continue;
    if (isClosing) {
      const lastIndex = stack.lastIndexOf(tag);
      if (lastIndex !== -1) stack.splice(lastIndex, 1);
    } else {
      stack.push(tag);
    }
  }
  while (stack.length > 0) {
    clean += `</${stack.pop()}>`;
  }
  return clean;
}

// Models sometimes wrap JSON in ```fences```, add prose around it, or cut off
// mid-generation due to token limits. Pull out and auto-repair the JSON object
// so no story is dropped due to minor trailing truncation.
export function extractJson(raw) {
  if (!raw || typeof raw !== "string") throw new Error("No JSON in model output");
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // 1. Direct standard parse
  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model output");

  // 2. Balanced curly-brace parse
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {}
      }
    }
  }

  // 3. Resilient Truncation Auto-Repair:
  // Model ran out of tokens before closing quotes or braces.
  let repaired = text.slice(start);
  if (inString) repaired += '"';

  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') inStr = !inStr;
    if (inStr) continue;
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces = Math.max(0, openBraces - 1);
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets = Math.max(0, openBrackets - 1);
  }
  if (inStr) repaired += '"';
  while (openBrackets > 0) { repaired += "]"; openBrackets--; }
  while (openBraces > 0) { repaired += "}"; openBraces--; }

  try {
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === "object") {
      if (parsed.content) parsed.content = repairHtml(parsed.content);
      return parsed;
    }
  } catch {}

  // 4. Fallback: Robust regex field extraction
  const extractField = (name) => {
    const reg = new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
    const m = text.match(reg);
    if (m) {
      try {
        return JSON.parse(`"${m[1]}"`);
      } catch {
        return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      }
    }
    const truncReg = new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*[,}]|$)`, "s");
    const tm = text.match(truncReg);
    if (tm && tm[1]) {
      return tm[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    return "";
  };

  const title = extractField("title");
  const description = extractField("description");
  let content = extractField("content");
  const image_person = extractField("image_person");
  const image_query = extractField("image_query");

  let key_points = [];
  const kpMatch = text.match(/"key_points"\s*:\s*\[([\s\S]*?)(\]|$)/);
  if (kpMatch && kpMatch[1]) {
    const items = kpMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (items) {
      key_points = items.map((s) => {
        try { return JSON.parse(s); } catch { return s.replace(/^"|"$/g, ""); }
      });
    }
  }

  if (content) content = repairHtml(content);

  if (title || content) {
    return {
      title: title || "Verified Report",
      description: description || title,
      key_points,
      content,
      image_person,
      image_query,
    };
  }

  throw new Error("Could not extract or repair JSON from model output");
}
