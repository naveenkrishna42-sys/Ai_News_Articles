import assert from "node:assert/strict";
import { sanitizeProductName, tagIndiaOnlyLinks, renderBuyBox } from "../scripts/lib/affiliate.mjs";
import { extractCleanProductName, isUnmonetizableRegionalDeal } from "../scripts/lib/deal-extractor.mjs";
import { buildNichePrompt } from "../scripts/lib/gadget-prompts.mjs";
import { normalizeInlineMarkdown, renderArticlePage } from "../scripts/lib/template.mjs";
import { ProviderPool } from "../scripts/lib/providers.mjs";

console.log("Running Pipeline, Geo-Routing & Regional Filter Audit Tests...\n");

// 1. Clean product query extraction on Black Friday / Outlook / conversational headlines
assert.strictEqual(
  sanitizeProductName("Black Friday Pixel 2026 Outlook: What to Expect from Google's Flagships"),
  "Google Pixel",
  "Must extract clean 'Google Pixel' without Black Friday, 2026, or Outlook"
);
assert.strictEqual(
  extractCleanProductName("Black Friday Pixel 2026 Outlook: What to Expect from Google's Flagships"),
  "Google Pixel",
  "Deal extractor must also resolve 'Google Pixel'"
);
assert.strictEqual(
  sanitizeProductName("I Tested Amex Platinum Concierge Service: Is It Worth It?"),
  "",
  "Conversational pronoun fragment must be rejected by sanitizeProductName"
);
console.log("✓ Test 1: Product query sanitization for Black Friday & conversational titles passed");

// 2. Option A Regional Filter: blocks US-locked retail/carrier/streaming, allows global hardware & non-commercial news
assert.strictEqual(
  isUnmonetizableRegionalDeal("Black Friday 2026: Deep Streaming Deals on Max, Apple TV+, Paramount+", "", "Product Deals & Offers"),
  true,
  "Must block US-only streaming bundle deals"
);
assert.strictEqual(
  isUnmonetizableRegionalDeal("Early Black Friday Deals Roundup: Omnilux, Nordstrom & More", "", "Product Deals & Offers"),
  true,
  "Must block US-only department store deals"
);
assert.strictEqual(
  isUnmonetizableRegionalDeal("Indian-Origin Couple Killed Outside Surrey Walmart in Targeted Shooting", "", "Breaking News"),
  false,
  "Must NEVER block general Breaking News mentioning Walmart"
);
assert.strictEqual(
  isUnmonetizableRegionalDeal("Samsung Galaxy S26 FE Black Friday Review: Is This the Right Price?", "", "Product Deals & Offers"),
  false,
  "Must allow global hardware deals under Option A"
);
console.log("✓ Test 2: Option A regional deal filter passed");

// 3. Niche prompts must genuinely customize base SYSTEM_PROMPT (no silent .replace no-op)
const sampleBasePrompt = "You are a senior investigative journalist at TIVRA News. Length: 500 to 750 words.";
for (const kind of ["temple", "ai-tips", "deals", "credit-cards"]) {
  const built = buildNichePrompt(kind, sampleBasePrompt);
  assert.notStrictEqual(built, sampleBasePrompt, `buildNichePrompt("${kind}") must not return unmodified prompt`);
  assert.ok(!built.includes("500 to 750 words"), `buildNichePrompt("${kind}") must customize word count`);
}
console.log("✓ Test 3: All 4 niche prompts verified active (zero no-op regressions)");

// 4. Inline Markdown **bold** conversion & extensionless canonical URLs
assert.strictEqual(
  normalizeInlineMarkdown("<ul><li>**Anticipate Strong Discounts:** Great value.</li></ul>"),
  "<ul><li><strong>Anticipate Strong Discounts:</strong> Great value.</li></ul>"
);
const samplePage = renderArticlePage({
  title: "Google Pixel Deal Guide",
  description: "Summary",
  category: "Product Deals & Offers",
  date: "2026-11-24",
  heroImage: "",
  heroCredit: "",
  keyPoints: ["**Fast chip:** Smooth daily use"],
  bodyHtml: "<p>**Key takeaway:** Solid flagship.</p>" + renderBuyBox(["Google Pixel"], {}, "Product Deals & Offers", "", "Google Pixel"),
  sourceName: "TIVRA",
  sourceUrl: "",
  youtubeId: "",
  slug: "2026-11-24-google-pixel-deal-guide",
  adsensePublisherId: "ca-pub-6206818645443465",
  siteUrl: "https://tivranews.com",
});
assert.ok(samplePage.includes('<link rel="canonical" href="https://tivranews.com/articles/2026-11-24-google-pixel-deal-guide">'), "Canonical must be extensionless");
assert.ok(!samplePage.includes("**Key takeaway:**") && samplePage.includes("<strong>Key takeaway:</strong>"), "Body markdown bold must be converted");
assert.ok(samplePage.includes('data-geo="IN"'), "India-only merchants in buybox must carry data-geo=IN");
assert.ok(samplePage.includes('data-geo-price="IN"'), "Tech Under ₹499 link must carry data-geo-price=IN");

const globalTagged = tagIndiaOnlyLinks('<a href="https://linksredirect.com/?cid=316413&url=https%3A%2F%2Fwww.coursera.org">Coursera</a>');
assert.ok(!globalTagged.includes('data-geo="IN"'), "Global partners like Coursera must stay visible worldwide");
console.log("✓ Test 4: Extensionless canonical, Markdown bold conversion & Geo-Smart BuyBox tagging passed");

// 5. ProviderPool in-band HTTP 200 credit exhaustion & non-JSON failover guard
process.env.TEST_POLL_KEY = "test-poll";
process.env.TEST_FALLBACK_KEY = "test-fb";
const testPool = new ProviderPool([
  { name: "poll-test", baseUrl: "https://gen.pollinations.ai/v1", model: "community/test", envKey: "TEST_POLL_KEY", tier: "tier1-unlimited-free", rpm: 600 },
  { name: "fb-test", baseUrl: "https://example.com/v1", model: "fallback-json", envKey: "TEST_FALLBACK_KEY", tier: "tier2-daily-free", rpm: 600 },
]);
const origFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    if (String(url).includes("pollinations.ai")) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "The account behind this API key doesn't have enough credits. Please [top up](https://enter.pollinations.ai/top-up) or [complete a quest](https://enter.pollinations.ai/quests).",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content: '{"title":"Valid Fallback JSON","content":"<p>Body</p>"}' } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  const chatRes = await testPool.chat({
    system: 'Output STRICT JSON only matching this exact schema: {"title":"...","content":"..."}',
    user: "Headline: Test Headline",
  });
  assert.strictEqual(chatRes.provider, "fb-test", "Must retire depleted Pollinations provider and fail over to fb-test");
  assert.strictEqual(testPool.providers[0].cooldownUntil, Infinity, "Depleted Pollinations provider must be permanently retired for the run");
} finally {
  globalThis.fetch = origFetch;
}
console.log("✓ Test 5: ProviderPool HTTP 200 in-band credit exhaustion retirement & failover passed");

console.log("\n✅ ALL Pipeline & Geo-Smart Audit tests passed!\n");
