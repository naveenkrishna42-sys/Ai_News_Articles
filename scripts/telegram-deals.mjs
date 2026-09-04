#!/usr/bin/env node
/**
 * TIVRA Deals — High-Volume Telegram Broadcast Worker
 * 
 * Delivers top national and international individual product deals directly to Telegram:
 * - 15 individual product deals per execution (hourly / on-demand)
 * - Exact deal prices, original MRP, % discount
 * - Real card & bank offers (HDFC, ICICI, SBI, Axis)
 * - Coupon codes & key highlights
 * - 100% direct merchant links (Zero cuelinks redirect leaks)
 * - PURE DEALS ONLY (No unnecessary blog/article links)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveProductDealsQueue, verifyNoCuelinksLeak } from './lib/deals-engine.mjs';

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
  const coupon = deal.coupon ? `🏷️ <b>Coupon Code:</b> <code>${escapeHtml(deal.coupon)}</code>\n` : "";
  const rating = deal.rating ? `⭐ <b>Rating:</b> ${escapeHtml(deal.rating)}\n` : "";
  const merchant = deal.merchant || "Official Store";
  const buyUrl = deal.buyUrl;

  const highlights = Array.isArray(deal.highlights) && deal.highlights.length > 0
    ? `\n✨ <b>Key Highlights:</b>\n` + deal.highlights.map(h => `• ${escapeHtml(h)}`).join("\n") + "\n"
    : "";

  let priceLine = `💰 <b>Deal Price:</b> ${dealPrice}`;
  if (mrp && mrp !== dealPrice) {
    priceLine += ` <s>${mrp}</s>${discount}`;
  }

  let bankLine = cardOffer ? `\n💳 <b>Bank / Card Offer:</b> ${escapeHtml(cardOffer)}` : "";

  return `${badge}: <b>${escapeHtml(title)}</b>\n\n` +
    `${priceLine}${bankLine}\n` +
    `${coupon}` +
    `${rating}` +
    `${highlights}\n` +
    `🛒 <b>Grab Deal:</b> <a href="${buyUrl}">Buy on ${escapeHtml(merchant)} &rarr;</a>\n\n` +
    `⚡ <i>Verified Direct Deal · Price & stock subject to change.</i>`;
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
      return JSON.parse(fs.readFileSync(DISPATCHED_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveDispatched(list) {
  try {
    const dir = path.dirname(DISPATCHED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Keep last 1000 dispatched records
    fs.writeFileSync(DISPATCHED_FILE, JSON.stringify(list.slice(-1000), null, 2), 'utf8');
  } catch (e) {
    console.warn('[Telegram Deals] Could not save dispatched state:', e.message);
  }
}

async function sendTelegramMessage(token, channelId, text, buyUrl) {
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
  const dispatchedIds = new Set(dispatched.map(d => typeof d === 'string' ? d : d.id));

  // Find candidate deals not yet sent in this cycle
  let candidates = allDeals.filter(d => !dispatchedIds.has(d.id));

  // If all catalog deals have been cycled through, reset older than 48 hours
  if (candidates.length < targetCount) {
    console.log(`[TIVRA Deals] Refreshing queue: cycling back through best trending deals.`);
    candidates = allDeals;
  }

  // Pick balanced selection across categories
  const selectedDeals = candidates.slice(0, targetCount);

  if (selectedDeals.length === 0) {
    console.log('[TIVRA Deals] No deals available to broadcast.');
    return { sent: 0, failed: 0 };
  }

  console.log(`[TIVRA Deals] Broadcasting ${selectedDeals.length} individual product deals...`);

  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < selectedDeals.length; i++) {
    const deal = selectedDeals[i];
    
    // Safety check: ensure URL never leaks to cuelinks.com
    const isSafe = await verifyNoCuelinksLeak(deal.buyUrl, 3000);
    if (!isSafe) {
      console.warn(`[TIVRA Deals] SKIPPED: URL failed anti-cuelinks verification for ${deal.title}`);
      continue;
    }

    const messageText = formatTelegramDeal(deal);

    if (isDryRun) {
      console.log(`\n--- [DEAL #${i + 1} / ${selectedDeals.length}] ---`);
      console.log(messageText);
      sentCount++;
    } else {
      try {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, messageText, deal.buyUrl);
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
