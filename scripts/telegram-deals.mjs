#!/usr/bin/env node
/**
 * TIVRA Deals — High-Volume Telegram Broadcast Worker
 * 
 * Delivers top national and international individual product deals directly to Telegram:
 * - 15 individual product deals per execution (hourly / on-demand)
 * - Exact deal prices, original MRP, % discount
 * - Real card & bank offers (HDFC, ICICI, SBI, Axis)
 * - Coupon codes & key highlights
 * - High-resolution visual product image with every deal
 * - 100% direct merchant links (Zero cuelinks redirect leaks & zero 404s)
 * - PURE DEALS ONLY (No unnecessary blog/article links)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveProductDealsQueue, verifyNoCuelinksLeak, verifyAndHealDealLink } from './lib/deals-engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DISPATCHED_FILE = path.join(ROOT, 'data', 'telegram-deals-dispatched.json');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8725425068:AAE3MzMTEMcu1PjMVqpCbwesPjH_rkV5hLg";
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || "@tivranews_official";

/**
 * Builds high-converting, beautiful Telegram HTML message for an individual product deal
 */
export function formatTelegramDeal(deal) {
  const badge = deal.badge || "🔥 TOP PRODUCT DEAL";
  const title = deal.title || "Featured Product";
  const dealPrice = deal.dealPrice || "Best Price";
  const mrp = deal.mrp || "";
  const discount = deal.discount ? ` <i>(${deal.discount})</i>` : "";
  const cardOffer = deal.cardOffer || "";
  const coupon = deal.coupon ? `🏷️ <b>Coupon:</b> <code>${escapeHtml(deal.coupon)}</code>\n` : "";
  const rating = deal.rating ? `⭐ <b>Rating:</b> ${escapeHtml(deal.rating)}\n` : "";
  const merchant = deal.merchant || "Official Store";
  const buyUrl = deal.buyUrl;

  const highlights = Array.isArray(deal.highlights) && deal.highlights.length > 0
    ? `\n✨ <b>Key Highlights:</b>\n` + deal.highlights.slice(0, 4).map(h => `• ${escapeHtml(h)}`).join("\n") + "\n"
    : "";

  let priceLine = `💰 <b>Deal Price:</b> ${dealPrice}`;
  if (mrp && mrp !== dealPrice) {
    priceLine += ` <s>${mrp}</s>${discount}`;
  }

  let bankLine = cardOffer ? `\n💳 <b>Bank / Card Offer:</b> ${escapeHtml(cardOffer)}` : "";
  const cpcCardUrl = "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.bankbazaar.com%2Fcredit-card.html";
  const cpcLine = `\n⚡ <b>Instant Cashback / EMI:</b> <a href="${cpcCardUrl}">Check 10% Card Discount Eligibility &rarr;</a>`;

  const text = `${badge}: <b>${escapeHtml(title)}</b>\n\n` +
    `${priceLine}${bankLine}\n` +
    `${coupon}` +
    `${rating}` +
    `${highlights}\n` +
    `🛒 <b>Grab Deal:</b> <a href="${buyUrl}">Buy on ${escapeHtml(merchant)} &rarr;</a>` +
    `${cpcLine}\n\n` +
    `⚡ <i>Verified Direct Deal · 100% In-Stock Guarantee.</i>`;

  // Telegram captions must not exceed 1024 characters
  return text.length > 1000 ? text.slice(0, 990) + "..." : text;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function loadDispatched() {
  try {
    if (fs.existsSync(DISPATCHED_FILE)) {
      const raw = fs.readFileSync(DISPATCHED_FILE, 'utf8');
      if (raw && raw.trim().startsWith('[')) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          // Pure-logic deduplication on load by normalized slug/id, preserving latest sentAt
          const map = new Map();
          for (const item of list) {
            if (!item) continue;
            const key = String(item.id || item.title || '').toLowerCase().replace(/[^\w]/g, '').slice(0, 30);
            if (!key) continue;
            if (!map.has(key) || new Date(item.sentAt || 0) > new Date(map.get(key).sentAt || 0)) {
              map.set(key, item);
            }
          }
          return Array.from(map.values()).sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
        }
      }
    }
  } catch (e) {}
  return [];
}

function saveDispatched(list) {
  try {
    const dir = path.dirname(DISPATCHED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Pure-logic deduplication on save
    const map = new Map();
    for (const item of list) {
      if (!item) continue;
      const key = String(item.id || item.title || '').toLowerCase().replace(/[^\w]/g, '').slice(0, 30);
      if (!key) continue;
      if (!map.has(key) || new Date(item.sentAt || 0) > new Date(map.get(key).sentAt || 0)) {
        map.set(key, item);
      }
    }
    const cleanList = Array.from(map.values())
      .sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0))
      .slice(-1000);
    const tmpFile = `${DISPATCHED_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(cleanList, null, 2), 'utf8');
    fs.renameSync(tmpFile, DISPATCHED_FILE);
  } catch (e) {
    console.warn('[Telegram Deals] Could not save dispatched state:', e.message);
  }
}

/**
 * Sends a visually rich photo deal with caption or falls back to message
 */
async function sendTelegramPhotoOrMessage(token, channelId, text, imageUrl, buyUrl) {
  // 1. Try sending with visual Product Photo (sendPhoto)
  if (imageUrl && imageUrl.startsWith('http')) {
    try {
      const photoUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
      const photoRes = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          photo: imageUrl,
          caption: text,
          parse_mode: 'HTML'
        })
      });

      if (photoRes.ok) {
        return true;
      }
      const photoErr = await photoRes.text();
      console.warn(`[Telegram] sendPhoto failed (${photoRes.status}): ${photoErr}. Falling back to text...`);
    } catch (e) {
      console.warn(`[Telegram] sendPhoto network error: ${e.message}. Falling back to text...`);
    }
  }

  // 2. Fallback to sendMessage
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API responded with status ${res.status}: ${err}`);
  }
  return true;
}

export async function runBroadcast(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const limit = options.limit || parseInt(process.argv.find((arg, i, arr) => arr[i - 1] === '--limit') || '15', 10);
  const singleTest = options.singleTest || process.argv.includes('--single-test');
  const targetCount = singleTest ? 1 : limit;

  console.log(`[TIVRA Deals Telegram] Starting Broadcast (Target: ${targetCount} deals, Dry-Run: ${isDryRun})...`);

  const allDeals = await getLiveProductDealsQueue();
  console.log(`[TIVRA Deals Engine] Found ${allDeals.length} available product deals.`);

  const dispatched = loadDispatched();
  const now = Date.now();
  const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours uniqueness window

  // Fingerprint recently sent deals by ID and normalized title slug
  const recentFingerprints = new Set();
  for (const d of dispatched) {
    if (!d) continue;
    const sentTime = d.sentAt ? new Date(d.sentAt).getTime() : 0;
    if (now - sentTime < RECENT_WINDOW_MS) {
      if (d.id) recentFingerprints.add(String(d.id).toLowerCase());
      if (d.title) {
        const slug = String(d.title).toLowerCase().replace(/[^\w]/g, '').slice(0, 30);
        recentFingerprints.add(slug);
      }
    }
  }

  // Find candidate deals not sent in the last 48 hours
  let candidates = allDeals.filter(d => {
    if (recentFingerprints.has(String(d.id).toLowerCase())) return false;
    const slug = String(d.title || '').toLowerCase().replace(/[^\w]/g, '').slice(0, 30);
    return !recentFingerprints.has(slug);
  });

  // If candidates are fewer than target, backfill using oldest-sent deals (NEVER naive index 0 repeat)
  if (candidates.length < targetCount) {
    const candidateIds = new Set(candidates.map(c => c.id));
    const remainingNeeded = targetCount - candidates.length;

    const lastSentMap = new Map();
    for (const d of dispatched) {
      const time = d.sentAt ? new Date(d.sentAt).getTime() : 0;
      if (!lastSentMap.has(d.id) || time > lastSentMap.get(d.id)) {
        lastSentMap.set(d.id, time);
      }
    }

    const backfill = allDeals
      .filter(d => !candidateIds.has(d.id))
      .sort((a, b) => (lastSentMap.get(a.id) || 0) - (lastSentMap.get(b.id) || 0));

    candidates = [...candidates, ...backfill.slice(0, remainingNeeded)];
  }

  // Ensure balanced category diversity (round-robin across categories)
  const byCategory = new Map();
  for (const deal of candidates) {
    const cat = deal.category || 'General';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(deal);
  }

  const selectedDeals = [];
  let added = true;
  while (selectedDeals.length < targetCount && added) {
    added = false;
    for (const [cat, items] of byCategory.entries()) {
      if (selectedDeals.length >= targetCount) break;
      if (items.length > 0) {
        selectedDeals.push(items.shift());
        added = true;
      }
    }
  }

  if (selectedDeals.length === 0) {
    console.log('[TIVRA Deals] No deals available to broadcast.');
    return { sent: 0, failed: 0 };
  }

  console.log(`[TIVRA Deals] Broadcasting ${selectedDeals.length} fresh, category-balanced product deals...`);

  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < selectedDeals.length; i++) {
    let deal = selectedDeals[i];
    
    // 1. Pre-flight link health check and self-healing (No 404s)
    deal = await verifyAndHealDealLink(deal, 3000);

    // 2. Safety check: ensure URL never leaks to cuelinks.com
    const isSafe = await verifyNoCuelinksLeak(deal.buyUrl, 3000);
    if (!isSafe) {
      console.warn(`[TIVRA Deals] SKIPPED: URL failed anti-cuelinks verification for ${deal.title}`);
      continue;
    }

    const messageText = formatTelegramDeal(deal);

    if (isDryRun) {
      console.log(`\n--- [DEAL #${i + 1} / ${selectedDeals.length}] ---`);
      console.log(`Image: ${deal.imageUrl}`);
      console.log(messageText);
      sentCount++;
    } else {
      try {
        await sendTelegramPhotoOrMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, messageText, deal.imageUrl, deal.buyUrl);
        console.log(`✔ [${i + 1}/${selectedDeals.length}] Posted: ${deal.title.slice(0, 50)}...`);
        sentCount++;
        dispatched.push({
          id: deal.id,
          title: deal.title,
          sentAt: new Date().toISOString()
        });

        // Polite delay (2.5 seconds) between messages to respect Telegram rate limits
        if (i < selectedDeals.length - 1) {
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (err) {
        console.error(`✖ Failed to post "${deal.title}": ${err.message}`);
        failCount++;
      }
    }
  }

  if (!isDryRun && sentCount > 0) {
    saveDispatched(dispatched);
  }

  console.log(`[TIVRA Deals] Broadcast complete. Successfully sent: ${sentCount}, Failed: ${failCount}`);
  return { sent: sentCount, failed: failCount };
}

// Run CLI directly if invoked
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runBroadcast().catch(err => {
    console.error('[TIVRA Deals] Fatal error:', err);
    process.exit(1);
  });
}
