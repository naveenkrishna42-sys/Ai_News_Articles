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
    system: `You are the Senior Deals & Consumer Tech Editor at TIVRA News. 
Analyze the provided product deal / discount / price cut headline and write a structured, objective buyer's review.

OUTPUT RULES (STRICT & MANDATORY):
1. Return ONLY a single valid JSON object. Do not include markdown code fences (\`\`\`json), explanations, or preamble.
2. Every single field in the schema below is REQUIRED and MUST be non-empty.
3. "rating" must be a numeric float between 1.0 and 5.0 representing price-to-value ratio.
4. "pros" must be an array of 2 to 3 specific strings.
5. "cons" must be an array of 1 to 2 specific strings (real tradeoffs, not filler).
6. "articleBody" must be clean HTML with 2-3 <p> paragraphs (150-250 words total) explaining key specs, price drop value, and who should buy.
7. Do NOT mention affiliate programs, referral codes, or CashKaro anywhere in the text.

REQUIRED JSON SCHEMA:
{
  "title": "catchy deal headline under 70 chars (e.g. 'Samsung Galaxy S25 Ultra Price Drop: Is This Deal Worth It?')",
  "productName": "${cleanProduct}",
  "dealPrice": "mentioned sale price or price cut (e.g. '₹44,499' or 'Under ₹20,000')",
  "rating": 4.5,
  "ratingReason": "1 sentence justifying the value score",
  "dealSummary": "1 sentence summary of the discount or offer",
  "articleBody": "<p>paragraph 1 covering product & deal</p><p>paragraph 2 covering specs & tradeoffs</p>",
  "pros": ["specific pro 1", "specific pro 2"],
  "cons": ["specific con 1"],
  "verdict": "1 sentence final buy or wait verdict"
}`,
    user: `Headline: ${item.title}
Category: ${item.category}
Source: ${item.sourceName || "Tech Desk"}
Snippet: ${item.summary || item.title}`,
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
        maxTokens: 2500,
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
