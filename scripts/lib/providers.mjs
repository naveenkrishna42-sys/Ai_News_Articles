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
        cooldownUntil: 0,
        ok: 0,
        failed: 0,
      }));

      this.providers = [...capableProviders, ...fallbackProviders, ...this.providers];
      console.log(`[Providers] Successfully wired ${capableProviders.length} Capable Models (Tier 1) + ${fallbackProviders.length} Fallback Models (Tier 2).`);
    } else {
      console.log(`[Providers] Operating on Tier 3 verified free providers: ${this.providers.map((p) => p.name).join(", ")}`);
    }
  }

  get available() {
    return this.providers.filter((p) => Date.now() >= p.cooldownUntil);
  }

  next() {
    const live = this.available;
    if (live.length === 0) return null;
    const p = live[this.cursor % live.length];
    this.cursor++;
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
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 90_000);
        const isGoogle = provider.baseUrl.includes("generativelanguage.googleapis.com");
        const url = `${provider.baseUrl}/chat/completions`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        };
        if (isGoogle) {
          headers["x-goog-api-key"] = provider.apiKey;
        }
        if (provider.baseUrl.includes("openrouter.ai")) {
          headers["HTTP-Referer"] = "https://tivranews.com";
          headers["X-Title"] = "TIVRA News";
        }
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            model: provider.model,
            temperature,
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
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

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
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

// Models sometimes wrap JSON in ```fences``` or add prose around it — pull
// out the first top-level JSON object no matter how it's dressed.
export function extractJson(raw) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model output");
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
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON in model output");
}
