// TIVRA News — AI provider pool.
// Every provider speaks the OpenAI-compatible /chat/completions format, so
// swapping models or providers is a config edit (config/news-config.json),
// never a code change. Providers with no API key in the environment are
// skipped; a provider that rate-limits or errors is put on cooldown and the
// pool rotates to the next one. If every provider is down the caller skips
// that story — it retries naturally on the next scheduled run.

const COOLDOWN_MS = 90_000;

export class ProviderPool {
  constructor(providerConfigs) {
    this.providers = providerConfigs
      .map((p) => ({ ...p, apiKey: (process.env[p.envKey] || "").trim(), cooldownUntil: 0, ok: 0, failed: 0 }))
      .filter((p) => p.apiKey);
    this.cursor = 0;
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
