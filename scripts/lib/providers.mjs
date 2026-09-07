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
      .map((p) => ({ ...p, apiKey: (process.env[p.envKey] || "").trim(), cooldownUntil: 0, ok: 0, failed: 0 }))
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

    // 1. Fetch live active catalog from gen.pollinations.ai to verify model presence
    let liveCatalog = new Set();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${baseUrl}/models`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        for (const m of (data.data || [])) {
          if (m.id) liveCatalog.add(m.id);
        }
        console.log(`[Providers] Live Pollinations catalog contains ${liveCatalog.size} models.`);
      }
    } catch (err) {
      console.warn(`[Providers] Could not reach Pollinations live catalog: ${err.message}. Relying on config definitions.`);
    }

    const validCapable = capableConfigs.filter((m) => liveCatalog.size === 0 || liveCatalog.has(m.id));
    const validFallback = fallbackConfigs.filter((m) => liveCatalog.size === 0 || liveCatalog.has(m.id));

    // 2. Pre-flight handshake ping on top capable candidates (with multi-candidate resilience)
    let gatewayHealthy = false;
    let verifiedCandidate = null;
    const probeCandidates = validCapable.slice(0, 3);
    for (const candidate of probeCandidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: candidate.id,
            max_tokens: 2,
            messages: [{ role: "user", content: "1" }],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.status === 200) {
          gatewayHealthy = true;
          verifiedCandidate = candidate;
          console.log(`  ✔ [Pollinations Pre-flight] Handshake verified with ${candidate.id}.`);
          break;
        } else if (res.status === 402) {
          console.warn(`  ⚠ [Pollinations Pre-flight] Account balance exhausted (HTTP 402). Gracefully cascading to Tier 3 free providers.`);
          break;
        } else if (res.status === 401) {
          console.warn(`  ⚠ [Pollinations Pre-flight] Unauthorized (HTTP 401). Gracefully cascading to Tier 3 free providers.`);
          break;
        } else {
          console.warn(`  ⚠ [Pollinations Pre-flight] Candidate ${candidate.id} returned HTTP ${res.status}. Checking next...`);
        }
      } catch (err) {
        console.warn(`  ⚠ [Pollinations Pre-flight] Candidate ${candidate.id} timed out / error (${err.message}). Checking next...`);
      }
    }

    // 3. If gateway is healthy, wire Capable Models (Tier 1) and Fallback Models (Tier 2) to the front
    if (gatewayHealthy) {
      const sortedCapable = verifiedCandidate
        ? [verifiedCandidate, ...validCapable.filter((m) => m.id !== verifiedCandidate.id)]
        : validCapable;

      const capableProviders = sortedCapable.map((m) => ({
        name: m.name || m.id,
        baseUrl,
        model: m.id,
        apiKey,
        tier: "capable",
        rpm: m.rpm || 10,
        minIntervalMs: Math.ceil(60_000 / (m.rpm || 10)),
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      }));

      const fallbackProviders = validFallback.map((m) => ({
        name: m.name || m.id,
        baseUrl,
        model: m.id,
        apiKey,
        tier: "fallback",
        rpm: m.rpm || 10,
        minIntervalMs: Math.ceil(60_000 / (m.rpm || 10)),
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      }));

      const anonymousProvider = {
        name: "pollinations-anonymous-fast",
        baseUrl: "https://text.pollinations.ai/openai",
        model: "openai-fast",
        apiKey: "",
        tier: "fallback",
        rpm: 30,
        minIntervalMs: 2000,
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      };

      this.providers = [...capableProviders, ...fallbackProviders, anonymousProvider, ...this.providers];
      console.log(`[Providers] Successfully wired ${capableProviders.length} Capable Models (Tier 1) + ${fallbackProviders.length} Fallback Models (Tier 2) + Anonymous Free Provider.`);
    } else {
      const anonymousProvider = {
        name: "pollinations-anonymous-fast",
        baseUrl: "https://text.pollinations.ai/openai",
        model: "openai-fast",
        apiKey: "",
        tier: "fallback",
        rpm: 30,
        minIntervalMs: 2000,
        lastCallTime: 0,
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      };
      this.providers = [anonymousProvider, ...this.providers];
      console.log(`[Providers] Operating on Tier 3 verified free providers + Pollinations Anonymous.`);
    }
  }

  get available() {
    return this.providers.filter((p) => Date.now() >= p.cooldownUntil);
  }

  next() {
    const now = Date.now();
    const live = this.available;
    if (live.length === 0) return null;

    // 1. Look for a provider whose RPM rate-limit interval has already elapsed
    for (let i = 0; i < live.length; i++) {
      const idx = (this.cursor + i) % live.length;
      const candidate = live[idx];
      const elapsed = now - (candidate.lastCallTime || 0);
      if (elapsed >= (candidate.minIntervalMs || 0)) {
        this.cursor = (idx + 1) % live.length;
        return candidate;
      }
    }

    // 2. If all are currently cooling down within their RPM spacing, pick the one ready soonest
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
        if (waitMs > 0 && waitMs <= 10_000) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        provider.lastCallTime = Date.now();

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
