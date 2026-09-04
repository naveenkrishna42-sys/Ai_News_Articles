/**
 * TIVRA News — Deal Article Prompt & Rigid JSON Validator
 *
 * Enforces strict field-by-field JSON output for Product Deals & Gadgets.
 * Injects verified Amazon direct URLs after model response so links never hallucinate.
 */

import { extractJson } from "./providers.mjs";
import { extractCleanProductName } from "./deal-extractor.mjs";

export const REQUIRED_DEAL_FIELDS = [
  "title",
  "productName",
  "rating",
  "ratingReason",
  "dealSummary",
  "articleBody",
  "pros",
  "cons",
  "verdict",
];

export function buildDealPrompt(item, directUrl) {
  const cleanProduct = extractCleanProductName(item.title);

  return {
    system: `You are the Senior Consumer Tech & Product Review Editor at TIVRA News. 
Write a comprehensive, professional, authoritative buyer's analysis and product review for the featured item following Google's Search Quality E-E-A-T standards.

OUTPUT RULES (STRICT & MANDATORY):
1. Return ONLY a single valid JSON object without markdown code fences or extra text.
2. Every field in the schema below is REQUIRED and MUST be non-empty.
3. "rating" must be a numeric float between 1.0 and 5.0 representing price-to-performance ratio.
4. "pros" must be an array of 3 to 4 specific technical strengths.
5. "cons" must be an array of 2 to 3 genuine product tradeoffs or limitations.
6. "articleBody" must be in-depth HTML (500 to 750 words) using <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li> tags structured into:
   - <h3>Deal & Pricing Analysis</h3>: Explain the price drop, current street price, and historical value.
   - <h3>Key Technical Specifications</h3>: Include a clean HTML <table> comparing display, battery, processor, camera/build, and software.
   - <h3>Real-World Performance & Daily Use</h3>: Explain hands-on user experience, build quality, and battery endurance.
   - <h3>Competition & Market Alternatives</h3>: Compare with 1-2 chief rivals in the same price tier.
   - <h3>Who Should Buy This Deal</h3>: Actionable advice on who benefits most and who should wait.
7. NEVER mention AI, automated generation, affiliate links, CashKaro, or commission codes. Write with the authoritative voice of the TIVRA News Editorial Desk.

REQUIRED JSON SCHEMA:
{
  "title": "Authoritative headline under 75 chars (e.g. 'Samsung Galaxy S25 Ultra Price Drop Review: Is It Worth Buying?')",
  "productName": "${cleanProduct}",
  "dealPrice": "Current sale price or price range (e.g. '₹44,999' or 'Under ₹25,000')",
  "rating": 4.5,
  "ratingReason": "1-2 sentences justifying the value and price-to-performance score",
  "dealSummary": "Comprehensive 140-160 character meta description summarizing the deal and key takeaway",
  "articleBody": "Full structured HTML body (500-750 words with h3 subheadings and specifications table)",
  "pros": ["Technical pro 1", "Technical pro 2", "Technical pro 3"],
  "cons": ["Genuine tradeoff 1", "Genuine tradeoff 2"],
  "verdict": "2-3 sentence definitive buying recommendation for readers"
}`,
    user: `Headline: ${item.title}
Category: ${item.category}
Product/Merchant: ${item.merchant || item.productName || cleanProduct}
${item.couponCode ? `Coupon/Promo Code: ${item.couponCode}` : ""}
${item.validUntil ? `Offer Validity: Through ${item.validUntil}` : ""}
Source: ${item.sourceName || "TIVRA News Commerce Desk"}
Deal Details & Terms: ${item.summary || item.title}`,
  };
}

/**
 * Executes chat completion with multi-attempt retry and strict field validation
 */
export async function generateAndValidateDealArticle(pool, item, directUrl, maxRetries = 3) {
  const { system, user } = buildDealPrompt(item, directUrl);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await pool.chat({
        system,
        user,
        maxTokens: 4000,
        temperature: 0.2, // Low temperature for deterministic JSON output
      });

      const parsed = extractJson(response.text);
      if (!parsed || typeof parsed !== "object") {
        console.warn(`  [Deals] Attempt ${attempt}/${maxRetries} — Failed to extract JSON object.`);
        continue;
      }

      // Check required fields
      const missing = REQUIRED_DEAL_FIELDS.filter(
        (f) => parsed[f] === undefined || parsed[f] === null || parsed[f] === ""
      );

      if (missing.length > 0) {
        console.warn(`  [Deals] Attempt ${attempt}/${maxRetries} — Missing required fields: ${missing.join(", ")}`);
        continue;
      }

      // Coerce & clamp rating
      let ratingNum = parseFloat(parsed.rating);
      if (isNaN(ratingNum)) ratingNum = 4.2;
      parsed.rating = Math.min(5.0, Math.max(1.0, ratingNum)).toFixed(1);

      // Ensure pros & cons are arrays
      if (!Array.isArray(parsed.pros) || parsed.pros.length === 0) {
        parsed.pros = ["Competitive pricing for current market", "Strong core feature set"];
      }
      if (!Array.isArray(parsed.cons) || parsed.cons.length === 0) {
        parsed.cons = ["Check seller warranty and return window"];
      }

      // Enforce clean product name & verified direct link
      parsed.productName = parsed.productName || extractCleanProductName(item.title);
      parsed.directLink = directUrl;

      return parsed;
    } catch (err) {
      console.warn(`  [Deals] Attempt ${attempt}/${maxRetries} — Error: ${err.message}`);
    }
  }

  console.error(`  ✖ [Deals] Validation failed after ${maxRetries} attempts for: ${item.title.slice(0, 50)}`);
  return null;
}
