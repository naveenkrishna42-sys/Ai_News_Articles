import assert from 'assert';
import { extractAsinFromHtml } from '../scripts/lib/deal-extractor.mjs';

console.log('Running ASIN Extractor test...');

// 1. Standard dp link
const html1 = '<a href="https://www.amazon.in/dp/B0CX21C8S4?tag=abc">Buy Now</a>';
assert.strictEqual(extractAsinFromHtml(html1), 'B0CX21C8S4');

// 2. data-asin attribute
const html2 = '<div class="product" data-asin="B09G9F5YYP">Product</div>';
assert.strictEqual(extractAsinFromHtml(html2), 'B09G9F5YYP');

// 3. JSON embed
const html3 = '<script type="application/json">{"asin": "B08N5WRWNW", "price": 49999}</script>';
assert.strictEqual(extractAsinFromHtml(html3), 'B08N5WRWNW');

// 4. Mobile gp/aw/d link
const html4 = '<a href="https://www.amazon.in/gp/aw/d/B07XG2M5PQ">View Deal</a>';
assert.strictEqual(extractAsinFromHtml(html4), 'B07XG2M5PQ');

console.log('✅ ASIN Extractor unit tests passed.');
