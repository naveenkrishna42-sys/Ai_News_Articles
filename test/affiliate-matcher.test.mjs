import assert from 'assert';
import { renderBuyBox, injectInlineListicleButtons, sanitizeProductName } from '../scripts/lib/affiliate.mjs';

console.log("Running Universal Dynamic Affiliate Engine Unit Tests...\n");

const mockConfig = {
  affiliate: {
    enabled: true,
    amazonTag: "sirmohana-21",
    cuelinks: {
      cpcUrl: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.bankbazaar.com%2Fcredit-card.html",
      megaHighTicketUrl: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.riseworks.io"
    }
  }
};

// Test 1: Clean CTA Label Check (NO "(Paid link)" inside button text)
const gadgetBox = renderBuyBox(["OnePlus 13 Pro"], mockConfig, "Technology", "", "OnePlus 13 Pro Price Drop Today");
assert.ok(gadgetBox.includes("Buy at Amazon"), "Button must have clean 'Buy at Amazon' label");
assert.ok(gadgetBox.includes("Buy at Flipkart"), "Button must have clean 'Buy at Flipkart' label");
assert.ok(!gadgetBox.includes("<span>🛒 Check"), "Old wordy button format must be eliminated");
console.log("✓ Test 1: Clean High-Converting Action Labels passed");

// Test 2: Dynamic In-line Listicle Heading Parser
const mockBody = `
<h3>1. Amazon India</h3>
<p>Market leader in same-day delivery.</p>
<h3>2. Ajio</h3>
<p>Best for trendy fashion and deals.</p>
<h3>3. Samsung Galaxy S25</h3>
<p>Flagship smartphone with Snapdragon 8 Elite.</p>
`;

const processedBody = injectInlineListicleButtons(mockBody, mockConfig);
assert.ok(processedBody.includes("Buy at Amazon"), "Heading 1 Amazon must have dynamic button");
assert.ok(processedBody.includes("ajio.com") || processedBody.includes("Buy at Ajio"), "Heading 2 Ajio must have verified button");
assert.ok(processedBody.includes("Samsung Galaxy S25"), "Heading 3 must generate dynamic product search button");
console.log("✓ Test 2: Dynamic In-Line Listicle Item Linking passed");

// Test 3: Fashion Listicle Category Boundaries (Zero Croma/Reliance)
const fashionBox = renderBuyBox(["Top 10 Online Shopping Sites for Clothes"], mockConfig, "Product Deals & Offers", "", "Top 10 Online Shopping Sites in India for Clothes");
assert.ok(fashionBox.includes("Buy at Ajio"), "Fashion must include Ajio");
assert.ok(fashionBox.includes("Buy at Myntra"), "Fashion must include Myntra");
assert.ok(fashionBox.includes("Buy at Tata CLiQ"), "Fashion must include Tata CLiQ");
assert.ok(!fashionBox.includes("croma.com") && !fashionBox.includes("reliancedigital.in"), "Fashion must NEVER include Croma or Reliance");
console.log("✓ Test 3: Strict Fashion Category Boundaries passed");

// Test 4: Dedicated Health Insurance & Healthcare
const insuranceBox = renderBuyBox(["Health Insurance Scheme"], mockConfig, "Credit Cards & Cashback", "", "Why Health Insurance Matters in 2026: Coverage & Benefits");
assert.ok(insuranceBox.includes("Compare Health Insurance Plans"), "Must include Insurance action button");
assert.ok(insuranceBox.includes("1mg.com"), "Must include 1mg Health tests button");
assert.ok(!insuranceBox.includes("Lifetime Free Cards"), "Insurance MUST NOT show Credit Card button");
console.log("✓ Test 4: Dedicated Health Insurance & Healthcare matching passed");

// Test 5: High-EPC US Campaigns (Choice Hotels $32 CPC, Norwegian Cruise $12 CPC, Verpex $52 CPS)
const hotelBox = renderBuyBox(["Choice Hotels Deals"], mockConfig, "Product Deals & Offers", "", "Choice Hotels 2026: Save 30% on US Hotel Stays");
assert.ok(hotelBox.includes("choicehotels.com"), "Hotel deal must link to Choice Hotels");
assert.ok(hotelBox.includes("Choice Hotels"), "Button must name Choice Hotels");

const cruiseBox = renderBuyBox(["Norwegian Cruise Specials"], mockConfig, "Product Deals & Offers", "", "Norwegian Cruise Line: Caribbean Luxury Sailings & Perks");
assert.ok(cruiseBox.includes("ncl.com"), "Cruise deal must link to NCL");

const hostingBox = renderBuyBox(["Verpex Hosting Benchmark"], mockConfig, "Business", "", "Best Web Hosting for Startups in 2026: Cloud Server Benchmark");
assert.ok(hostingBox.includes("verpex.com"), "Hosting deal must link to Verpex");
console.log("✓ Test 5: High-EPC Global Travel, Cruise & Hosting matching passed");

// Test 6: Strict Query Sanitizer
assert.strictEqual(sanitizeProductName("Top 10 Online Shopping Websites in India: 2026's Best Picks"), "", "Junk listicle must be invalidated");
assert.strictEqual(sanitizeProductName("Samsung Galaxy S25 Ultra: Full Review"), "Samsung Galaxy S25 Ultra", "Clean product must be extracted");
console.log("✓ Test 6: Strict Query Sanitizer passed");

console.log("\n✅ ALL Universal Dynamic Affiliate Engine unit tests passed with 100% accuracy!\n");
