import assert from 'assert';
import { renderBuyBox, sanitizeProductName } from '../scripts/lib/affiliate.mjs';

console.log("Running Universal Affiliate Matcher & High-Yield Value Matrix Unit Tests...\n");

const mockConfig = {
  affiliate: {
    enabled: true,
    amazonTag: "sirmohana-21",
    cuelinks: {
      cpcUrl: "https://clnk.in/B5IL",
      megaHighTicketUrl: "https://clnk.in/B5IT"
    }
  }
};

// Test 1: Choice Hotels ($32.14/click CPC) matching
const hotelBox = renderBuyBox(["Choice Hotels Rewards"], mockConfig, "Product Deals & Offers", "", "Choice Hotels 2026: Save 30% on US Hotel Stays");
assert.ok(hotelBox.includes("choicehotels.com"), "Hotel deal must link to Choice Hotels");
assert.ok(hotelBox.includes("Choice Hotels"), "Button text must name Choice Hotels");
console.log("✓ Test 1: Choice Hotels ($32.14/clk) matching passed");

// Test 2: Norwegian Cruise Line ($12.86/click CPC) matching
const cruiseBox = renderBuyBox(["Norwegian Cruise Deal"], mockConfig, "Product Deals & Offers", "", "Norwegian Cruise Line: Caribbean Luxury Sailings & Perks");
assert.ok(cruiseBox.includes("ncl.com"), "Cruise deal must link to NCL");
assert.ok(cruiseBox.includes("Norwegian Cruise Line"), "Button text must name Norwegian Cruise Line");
console.log("✓ Test 2: Norwegian Cruise ($12.86/clk) matching passed");

// Test 3: Verpex Cloud Hosting ($52.50 / sale CPS) matching
const hostingBox = renderBuyBox(["Verpex Hosting Review"], mockConfig, "Business", "", "Best Web Hosting for Startups in 2026: Cloud Server Benchmark");
assert.ok(hostingBox.includes("verpex.com"), "Hosting deal must link to Verpex");
assert.ok(hostingBox.includes("Cloud Web Hosting"), "Button text must mention Cloud Web Hosting");
console.log("✓ Test 3: Verpex Cloud Hosting ($52.50/sale) matching passed");

// Test 4: Reliance Digital matching
const relianceBox = renderBuyBox(["Reliance discount schemes"], mockConfig, "Product Deals & Offers", "", "Reliance Discounts: Republic Day Savings Worth Checking");
assert.ok(relianceBox.includes("reliancedigital.in"), "Reliance deal must link to Reliance Digital");
console.log("✓ Test 4: Reliance Digital brand matching passed");

// Test 5: Ajio matching
const ajioBox = renderBuyBox(["Ajio Kurta Sale"], mockConfig, "Product Deals & Offers", "", "Ajio All Stars Sale: 80% Off on Top Styles");
assert.ok(ajioBox.includes("ajo.clnk.in/w0kl") || ajioBox.includes("ajio"), "Ajio deal must link to Ajio");
console.log("✓ Test 5: Ajio brand matching passed");

// Test 6: Multi-Store Clothing Listicle 5-brand hub
const listicleBox = renderBuyBox(["Top 10 Online Shopping Sites in India for Clothes"], mockConfig, "Product Deals & Offers", "", "Top 10 Online Shopping Sites in India for Clothes");
assert.ok(listicleBox.includes("ajo.clnk.in/w0kl"), "Listicle must include Ajio card");
assert.ok(listicleBox.includes("myntra.com"), "Listicle must include Myntra card");
assert.ok(listicleBox.includes("tatacliq.com"), "Listicle must include Tata CLiQ card");
assert.ok(listicleBox.includes("amazon.in"), "Listicle must include Amazon Fashion card");
assert.ok(listicleBox.includes("flipkart.com"), "Listicle must include Flipkart Fashion card");
console.log("✓ Test 6: Multi-Store Clothing Listicle 5-brand hub passed");

// Test 7: Multi-Source Value Matrix for Gadgets & Tech
const gadgetBox = renderBuyBox(["Samsung Galaxy S25 Ultra"], mockConfig, "Technology", "", "Samsung Galaxy S25 Ultra Price Drop: Best Deal Today");
assert.ok(gadgetBox.includes("amazon.in"), "Gadget deal must include Amazon button");
assert.ok(gadgetBox.includes("flipkart.com"), "Gadget deal must include Flipkart button");
assert.ok(gadgetBox.includes("croma.com"), "Gadget deal must include Croma button");
assert.ok(gadgetBox.includes("reliancedigital.in"), "Gadget deal must include Reliance Digital button");
console.log("✓ Test 7: Multi-Source Value Matrix (Amazon + Flipkart + Croma + Reliance) passed");

// Test 8: Contextual Fixed Deposit (FD) matching
const fdBox = renderBuyBox(["SBI Senior Citizen FD Scheme"], mockConfig, "Banking", "", "Senior Citizens: Highest Bank FD Rates in 2026");
assert.ok(fdBox.includes("Bank FD Rates"), "FD deal must link to Bank FD comparison");
assert.ok(!fdBox.includes("Rise Works") && !fdBox.includes("clnk.in/B5IT"), "FD deal must NEVER link to B2B SaaS");
console.log("✓ Test 8: Contextual Fixed Deposit (FD) matching passed");

console.log("\n✅ ALL Universal Affiliate Matcher & High-Yield Value Matrix unit tests passed with 100% accuracy!\n");
