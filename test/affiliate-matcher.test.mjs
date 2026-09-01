import assert from 'assert';
import { renderBuyBox, sanitizeProductName } from '../scripts/lib/affiliate.mjs';

console.log("Running Universal Affiliate Matcher & Multi-Source Value Matrix Unit Tests...\n");

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

// Test 1: Reliance story MUST route to Reliance Digital via Cuelinks (NEVER Amazon!)
const relianceBox = renderBuyBox(["Reliance discount schemes"], mockConfig, "Product Deals & Offers", "", "Reliance Discounts: Republic Day Savings Worth Checking");
assert.ok(relianceBox.includes("reliancedigital.in"), "Reliance deal must link to Reliance Digital");
assert.ok(relianceBox.includes("Reliance Digital"), "Button text must name Reliance Digital");
assert.ok(!relianceBox.includes("amazon.in/s?k=Reliance"), "Must NEVER search Reliance on Amazon");
console.log("✓ Test 1: Reliance Digital brand matching passed");

// Test 2: Croma story MUST route to Croma
const cromaBox = renderBuyBox(["Croma Fest"], mockConfig, "Product Deals & Offers", "", "Croma Electronics Festival: Best Laptop Deals");
assert.ok(cromaBox.includes("croma.com"), "Croma deal must link to Croma");
assert.ok(cromaBox.includes("Croma"), "Button text must name Croma");
console.log("✓ Test 2: Croma brand matching passed");

// Test 3: Ajio story MUST route to Ajio
const ajioBox = renderBuyBox(["Ajio Kurta Sale"], mockConfig, "Product Deals & Offers", "", "Ajio All Stars Sale: 80% Off on Top Styles");
assert.ok(ajioBox.includes("ajo.clnk.in/w0kl") || ajioBox.includes("ajio"), "Ajio deal must link to Ajio");
assert.ok(ajioBox.includes("Ajio"), "Button text must name Ajio");
console.log("✓ Test 3: Ajio brand matching passed");

// Test 4: Tata CLiQ story MUST route to Tata CLiQ
const tataBox = renderBuyBox(["Tata Cliq Luxury"], mockConfig, "Product Deals & Offers", "", "Tata Cliq Weekend Sale: Premium Watches & Bags");
assert.ok(tataBox.includes("tatacliq.com"), "Tata Cliq deal must link to Tata Cliq");
console.log("✓ Test 4: Tata Cliq brand matching passed");

// Test 5: Multi-Store Clothing Listicle MUST render 5 multi-store cards (Ajio + Myntra + Tata CLiQ + Amazon + Flipkart)
const listicleBox = renderBuyBox(["Top 10 Online Shopping Sites in India for Clothes"], mockConfig, "Product Deals & Offers", "", "Top 10 Online Shopping Sites in India for Clothes");
assert.ok(listicleBox.includes("ajo.clnk.in/w0kl"), "Listicle must include Ajio card");
assert.ok(listicleBox.includes("myntra.com"), "Listicle must include Myntra card");
assert.ok(listicleBox.includes("tatacliq.com"), "Listicle must include Tata CLiQ card");
assert.ok(listicleBox.includes("amazon.in"), "Listicle must include Amazon Fashion card");
assert.ok(listicleBox.includes("flipkart.com"), "Listicle must include Flipkart Fashion card");
assert.ok(!listicleBox.includes("s?k=Top%2010"), "Must NEVER search 'Top 10' on Amazon");
console.log("✓ Test 5: Multi-Store Clothing Listicle 5-brand hub passed");

// Test 6: Multi-Source Value Matrix for Gadgets & Tech (Amazon + Flipkart + Croma + Reliance Digital)
const gadgetBox = renderBuyBox(["Samsung Galaxy S25 Ultra"], mockConfig, "Technology", "", "Samsung Galaxy S25 Ultra Price Drop: Best Deal Today");
assert.ok(gadgetBox.includes("amazon.in"), "Gadget deal must include Amazon button");
assert.ok(gadgetBox.includes("flipkart.com"), "Gadget deal must include Flipkart button");
assert.ok(gadgetBox.includes("croma.com"), "Gadget deal must include Croma button");
assert.ok(gadgetBox.includes("reliancedigital.in"), "Gadget deal must include Reliance Digital button");
assert.ok(gadgetBox.includes("sirmohana-21"), "Amazon button must carry Amazon tag");
assert.ok(gadgetBox.includes("310115"), "Cuelinks buttons must carry CID");
console.log("✓ Test 6: Multi-Source Value Matrix (Amazon + Flipkart + Croma + Reliance) passed");

// Test 7: B2B SaaS / Global Payroll MUST route to Rise Works
const saasBox = renderBuyBox(["Global Payroll Platform"], mockConfig, "Business", "", "Rise Works Global Payroll: How Startups Automate International Hiring");
assert.ok(saasBox.includes("clnk.in/B5IT"), "SaaS deal must link to Rise Works");
console.log("✓ Test 7: Rise Works B2B SaaS matching passed");

// Test 8: Fixed Deposit (FD) articles MUST route to Bank FD & Savings rates (NEVER SaaS!)
const fdBox = renderBuyBox(["SBI Senior Citizen FD Scheme"], mockConfig, "Banking", "", "Senior Citizens: Highest Bank FD Rates in 2026");
assert.ok(fdBox.includes("Bank FD Rates"), "FD deal must link to Bank FD comparison");
assert.ok(!fdBox.includes("Rise Works") && !fdBox.includes("clnk.in/B5IT"), "FD deal must NEVER link to B2B SaaS");
console.log("✓ Test 8: Contextual Fixed Deposit (FD) matching passed");

// Test 9: Strict Sanitizer Tests
assert.strictEqual(sanitizeProductName("Top 10 Online Shopping Sites in India for Clothes"), "", "Must reject headline listicles");
assert.strictEqual(sanitizeProductName("Samsung Galaxy S25 Ultra"), "Samsung Galaxy S25 Ultra", "Must keep clean product model names");
console.log("✓ Test 9: Strict Query Sanitizer unit tests passed");

console.log("\n✅ ALL Universal Affiliate Matcher & Multi-Source Value Matrix unit tests passed with 100% accuracy!\n");
