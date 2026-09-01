import assert from 'assert';
import { renderBuyBox } from '../scripts/lib/affiliate.mjs';

console.log("Running Universal Affiliate Matcher Unit Tests...\n");

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

// Test 5: Generic Gadget (Samsung S25) MUST render Dual Store Comparison (Amazon + Flipkart)
const gadgetBox = renderBuyBox(["Samsung Galaxy S25 Ultra"], mockConfig, "Product Deals & Offers", "", "Samsung Galaxy S25 Ultra Price Drop: Best Deal Today");
assert.ok(gadgetBox.includes("amazon.in"), "Gadget deal must include Amazon button");
assert.ok(gadgetBox.includes("flipkart.com"), "Gadget deal must include Flipkart button");
assert.ok(gadgetBox.includes("sirmohana-21"), "Amazon button must have Amazon tag");
assert.ok(gadgetBox.includes("310115"), "Flipkart button must have Cuelinks CID");
console.log("✓ Test 5: Dual Store comparison (Amazon + Flipkart) passed");

// Test 6: B2B SaaS / Global Payroll MUST route to Rise Works
const saasBox = renderBuyBox(["Global Payroll Platform"], mockConfig, "Business", "", "Rise Works Global Payroll: How Startups Automate International Hiring");
assert.ok(saasBox.includes("clnk.in/B5IT"), "SaaS deal must link to Rise Works");
console.log("✓ Test 6: Rise Works B2B SaaS matching passed");

// Test 7: Credit Cards & Banking MUST render Partner Reward Card
const cardBox = renderBuyBox(["SBI Cashback Card"], mockConfig, "Credit Cards & Cashback", "", "Best Credit Cards for Airport Lounge Access in 2026");
assert.ok(cardBox.includes("clnk.in/B5IT"), "Card deal must link to high-ticket partner offer");
assert.ok(cardBox.includes("clnk.in/B5IL"), "Card deal must link to CPC rewards");
console.log("✓ Test 7: Credit card & banking offer matching passed");

console.log("\n✅ ALL Universal Affiliate Matcher unit tests passed with 100% accuracy!\n");
