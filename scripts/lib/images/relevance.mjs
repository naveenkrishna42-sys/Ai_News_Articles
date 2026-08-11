// Shared relevance gate for every device-image provider.
//
// All three providers (Wikimedia, Openverse, Unsplash) are full-text search
// engines that will happily return a file sharing one token with the query —
// "Motorola Edge 70 Pro" once matched a street photo of Luxembourg because
// the filename contained "70", and "OnePlus 15" matched a OnePlus 9 Pro.
// Showing the wrong handset is worse than showing a generic one, so a result
// is only accepted when the device name appears as a contiguous phrase.

const WEAK_TOKENS = new Set(
  "pro max plus ultra lite mini series edition new latest 5g 4g phone smartphone mobile device gadget official review front back rear image photo the and vs".split(" ")
);

// Right device, useless as a hero: damage shots, teardowns, packaging,
// logos, shop signage, video stills.
const JUNK_SUBJECT = /broken|damaged|cracked|smashed|teardown|disassembl|repair|scrap|logo|wordmark|icon|box|packaging|billboard|advertis|poster|store|shop|kiosk|booth|fps|kbit|vp9|aac|\d{3,4}p[_ -]/i;

export function tokenize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

/**
 * @param {string} label  filename / title / description from the provider
 * @param {string} query  what we searched for
 */
export function matchesQuery(label, query) {
  const text = String(label || "").replace(/^File:/i, "");
  if (!text) return false;
  if (JUNK_SUBJECT.test(text)) return false;
  const strong = tokenize(query).filter((t) => !WEAK_TOKENS.has(t));
  if (!strong.length) return true; // nothing distinctive to verify against
  return tokenize(text).join(" ").includes(strong.join(" "));
}
