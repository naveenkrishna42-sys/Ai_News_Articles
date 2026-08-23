import { getBestAmazonUrl } from "./scripts/lib/deal-extractor.mjs";
import fs from "node:fs";

async function testExtraction() {
    const config = JSON.parse(fs.readFileSync("./config/news-config.json", "utf-8"));
    const dealFeeds = config.feeds.filter(f => f.category === "Product Deals & Offers");
    
    let total = 0;
    let asinHits = 0;
    
    for (const feed of dealFeeds) {
        console.log(`\nFetching: ${feed.url}`);
        const res = await fetch(feed.url);
        const text = await res.text();
        
        const items = [...text.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>/g)];
        
        for (const item of items.slice(0, 10)) {
            const title = item[1].replace("<![CDATA[", "").replace("]]>", "").trim();
            const link = item[2].trim();
            total++;
            console.log(`\nTesting: ${title}`);
            try {
                // PASS AN OBJECT WITH sourceUrl AND title
                const url = await getBestAmazonUrl({ sourceUrl: link, title: title }, title);
                if (url && url.includes("/dp/")) {
                    console.log(`✅ ASIN HIT: ${url}`);
                    asinHits++;
                } else {
                    console.log(`⚠️ Fallback/Search URL: ${url}`);
                }
            } catch (e) {
                console.log(`❌ Error: ${e.message}`);
            }
        }
    }
    
    console.log(`\n--- Results ---`);
    console.log(`Total Deals Tested: ${total}`);
    console.log(`ASIN Hits: ${asinHits}`);
    console.log(`Hit Rate: ${Math.round((asinHits/total)*100)}%`);
}

testExtraction();
