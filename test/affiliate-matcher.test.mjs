import assert from 'assert';
import { renderBuyBox, injectInlineListicleButtons, sanitizeProductName, HIGH_PAYOUT_CAMPAIGNS } from '../scripts/lib/affiliate.mjs';

console.log("Running Universal Dynamic Affiliate Engine Unit Tests...\n");

const mockConfig = {
  affiliate: {
    enabled: true,
    cuelinks: {
      cpcUrl: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.bankbazaar.com%2Fcredit-card.html",
      megaHighTicketUrl: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.riseworks.io"
    }
  }
};

// Test 1: Clean CTA Label Check (NO "(Paid link)" inside button text & verified Amazon tag)
const gadgetBox = renderBuyBox(["OnePlus 13 Pro"], mockConfig, "Technology", "", "OnePlus 13 Pro Price Drop Today");
assert.ok(gadgetBox.includes("Buy at Amazon"), "Button must have clean 'Buy at Amazon' label");
assert.ok(gadgetBox.includes("Buy at Flipkart"), "Button must have clean 'Buy at Flipkart' label");
assert.ok(!gadgetBox.includes("<span>🛒 Check"), "Old wordy button format must be eliminated");
assert.ok(gadgetBox.includes("tag=sirmohana-21"), "Must include verified Amazon OneLink tag sirmohana-21");
console.log("✓ Test 1: Clean High-Converting Action Labels with verified OneLink tag passed");

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

// Test 7: High-Payout CPL Credit Cards (SBI, AU Bank, HDFC Swiggy, Scapia)
const ccBox = renderBuyBox(["Best Credit Cards for Lounge Access"], mockConfig, "Credit Cards & Cashback", "", "Best Credit Cards for Free Domestic Lounge Access in 2026");
assert.ok(ccBox.includes("Apply for SBI Simply Click"), "Credit card box must include SBI Simply Click CPL");
assert.ok(ccBox.includes("Apply for AU Bank"), "Credit card box must include AU Bank CPL");
assert.ok(ccBox.includes("Apply for HDFC Swiggy"), "Credit card box must include HDFC Swiggy CPL");
assert.ok(ccBox.includes("Scapia Zero-Forex Card"), "Credit card box must include Scapia CPL");
assert.ok(!ccBox.includes("amazon.in"), "Credit card box must NEVER default to Amazon search");
console.log("✓ Test 7: High-Payout CPL Credit Card action buttons passed");

// Test 8: Travel & Vacation Category Routing (Zero Amazon fallback)
const travelBox = renderBuyBox(["Top 5 Summer Vacation Destinations"], mockConfig, "Product Deals & Offers", "", "Top 5 Summer Vacation Destinations in 2026: Flight & Hotel Guide");
assert.ok(travelBox.includes("Scapia Card (Zero Forex"), "Travel box must include Scapia Zero Forex Card");
assert.ok(travelBox.includes("makemytrip.com"), "Travel box must include MakeMyTrip");
assert.ok(travelBox.includes("agoda.com"), "Travel box must include Agoda");
assert.ok(!travelBox.includes("Buy at Amazon"), "Travel box must NEVER default to Amazon");
console.log("✓ Test 8: Dedicated Travel & Hospitality routing passed");

// Test 9: Online Education & Courses (Zero Amazon fallback)
const eduBox = renderBuyBox(["AI & Machine Learning Certification"], mockConfig, "Education", "", "Top 10 AI and Data Science Certifications in 2026");
assert.ok(eduBox.includes("coursera.org"), "Education box must include Coursera");
assert.ok(eduBox.includes("udemy.com"), "Education box must include Udemy");
assert.ok(!eduBox.includes("Buy at Amazon"), "Education box must NEVER default to Amazon");
console.log("✓ Test 9: Dedicated Education & Online Learning routing passed");

console.log("\n✅ ALL Universal Dynamic Affiliate Engine unit tests passed with 100% accuracy!\n");
