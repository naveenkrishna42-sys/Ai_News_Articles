import sys

with open("scripts/lib/affiliate.mjs", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      const url = directUrl || buyUrl(displayName || name, config);
      if (!url) return "";
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>🛒 Check ${escapeHtml(displayName)} Price on Amazon</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span></a>`;"""

new_block = """      const url = directUrl || buyUrl(displayName || name, config);
      if (!url) return "";
      
      let storeName = "Amazon";
      let btnColor = "#e11d48";
      if (url.includes("flipkart.com")) { storeName = "Flipkart"; btnColor = "#2874f0"; }
      else if (url.includes("myntra.com")) { storeName = "Myntra"; btnColor = "#ff3f6c"; }
      
      let shortName = displayName.replace(/sale/i, "").replace(/20\\d\\d/g, "").replace(/flipkart/i, "").replace(/amazon/i, "").trim();
      if (!shortName || shortName.length < 3) shortName = "Deal";
      
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${btnColor};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>🛒 Check ${escapeHtml(shortName)} on ${storeName}</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span></a>`;"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("scripts/lib/affiliate.mjs", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Could not find old block")
