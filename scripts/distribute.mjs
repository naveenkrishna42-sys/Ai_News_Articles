import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://tivranews.com';
const DISPATCHED_FILE = path.resolve('data/dispatched.json');

export function isMonetizedDeal(article) {
  if (!article) return false;
  const cat = (article.category || '').toLowerCase();
  const title = (article.title || '').toLowerCase();
  
  return (
    cat.includes('deal') ||
    cat.includes('offer') ||
    cat.includes('cashback') ||
    cat.includes('card') ||
    cat.includes('gadget') ||
    /deal|sale|discount|price drop|cashback|loot|coupon|off|ajio|amazon|flipkart|myntra|payroll|saas|b2b/i.test(title)
  );
}

export function pickTelegramDeals(articles, limit = 4) {
  if (!Array.isArray(articles) || articles.length === 0) return [];
  // Exclusively filter for monetized deals, offers, discounts, and high-ticket reward stories
  const dealsOnly = articles.filter(isMonetizedDeal);
  
  // Newest deals first
  dealsOnly.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return dealsOnly.slice(0, limit);
}

export function pickTopStories(articles, limit = 3) {
  if (!Array.isArray(articles) || articles.length === 0) return [];
  return [...articles].slice(0, limit);
}

export function buildOneSignalPayload(appId, article) {
  const fullUrl = article.url.startsWith('http') ? article.url : `${SITE_URL}${article.url}`;
  const isDeal = (article.category || '').toLowerCase().includes('deal') || /deal|sale|price/i.test(article.title);
  const heading = isDeal ? `🔥 Top Deal: ${article.title}` : `⚡ Breaking: ${article.title}`;

  return {
    app_id: appId,
    included_segments: ['All'],
    headings: { en: heading.slice(0, 100) },
    contents: { en: (article.description || article.title).slice(0, 180) },
    url: fullUrl,
    big_picture: article.image || undefined,
    chrome_web_image: article.image || undefined
  };
}

export function buildTelegramMessage(article) {
  const fullUrl = article.url.startsWith('http') ? article.url : `${SITE_URL}${article.url}`;
  const cat = (article.category || '').toLowerCase();
  const title = article.title || '';
  const isFashion = /ajio|fashion|clothing|shoes|sneaker|kurta|shirt/i.test(title) || cat.includes('lifestyle');
  const isPayroll = /payroll|remote work|saas|contractor|hiring/i.test(title);
  const isFinance = cat.includes('card') || cat.includes('bank') || cat.includes('cashback') || cat.includes('insurance');
  const isDeal = cat.includes('deal') || /deal|sale|price drop/i.test(title);

  let icon = '📰';
  let extraCta = '';

  if (isPayroll) {
    icon = '💼';
    extraCta = `\n\n💼 <b>Global Payroll & Hiring:</b> <a href="https://clnk.in/B5IT">Explore Rise Global Payroll Plans</a>`;
  } else if (isFashion) {
    icon = '👗';
    extraCta = `\n\n🛍️ <b>Ajio Fashion Sale:</b> <a href="https://ajo.clnk.in/w0kl">Shop Top Styles (Up to 80% Off)</a>`;
  } else if (isFinance) {
    icon = '💳';
    extraCta = `\n\n🔥 <b>Exclusive Partner Benefit:</b> <a href="https://clnk.in/B5IT">Apply & Claim High-Value Rewards</a>`;
  } else if (isDeal) {
    icon = '🛍️';
    extraCta = `\n\n⚡ <b>Top Deals & Cashback:</b> <a href="https://clnk.in/B5IL">Explore Today's Cashback Offers</a>`;
  }

  return `${icon} <b>${escapeHtml(title)}</b>\n\n${escapeHtml((article.description || '').slice(0, 200))}\n\n👉 <a href="${fullUrl}">Read Full Story</a>${extraCta}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function sendOneSignal(article, isDryRun) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.log('[OneSignal] Credentials not set in environment (skipping push notification).');
    return false;
  }

  const payload = buildOneSignalPayload(appId, article);

  if (isDryRun) {
    console.log('[OneSignal Dry-Run] Would send payload:', JSON.stringify(payload, null, 2));
    return true;
  }

  try {
    const res = await fetchWithTimeout('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    }, 5000);

    if (res.ok) {
      console.log(`[OneSignal] Push sent successfully for: ${article.slug}`);
      return true;
    } else {
      const err = await res.text();
      console.warn(`[OneSignal] API responded with status ${res.status}: ${err}`);
      return false;
    }
  } catch (err) {
    console.warn(`[OneSignal] Request failed: ${err.message}`);
    return false;
  }
}

async function sendTelegram(article, isDryRun) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!token || !channelId) {
    console.log('[Telegram] Credentials not set in environment (skipping Telegram post).');
    return false;
  }

  const text = buildTelegramMessage(article);

  if (isDryRun) {
    console.log('[Telegram Dry-Run] Would post message:\n' + text);
    return true;
  }

  try {
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    }, 5000);

    if (res.ok) {
      console.log(`[Telegram] Message posted successfully for: ${article.slug}`);
      return true;
    } else {
      const err = await res.text();
      console.warn(`[Telegram] API responded with status ${res.status}: ${err}`);
      return false;
    }
  } catch (err) {
    console.warn(`[Telegram] Request failed: ${err.message}`);
    return false;
  }
}

function loadDispatched() {
  try {
    if (fs.existsSync(DISPATCHED_FILE)) {
      return JSON.parse(fs.readFileSync(DISPATCHED_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore corrupt state
  }
  return [];
}

function saveDispatched(list) {
  try {
    const dir = path.dirname(DISPATCHED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DISPATCHED_FILE, JSON.stringify(list.slice(-500), null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not save dispatched state:', e.message);
  }
}

export async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting TIVRA News Distribution Dispatcher... (Dry-Run: ${isDryRun})`);

  let articles = [];
  const feedPath = path.resolve('public/feed-latest.json');
  const altFeedPath = path.resolve('public/articles.json');

  if (fs.existsSync(feedPath)) {
    articles = JSON.parse(fs.readFileSync(feedPath, 'utf8')).articles || [];
  } else if (fs.existsSync(altFeedPath)) {
    articles = JSON.parse(fs.readFileSync(altFeedPath, 'utf8')).articles || [];
  }

  if (articles.length === 0) {
    console.log('No articles found in public feed to distribute.');
    return;
  }

  const dispatched = loadDispatched();
  const dispatchedSet = new Set(dispatched);

  const candidates = articles.filter(a => !dispatchedSet.has(a.slug || a.url));
  const topPicks = pickTopStories(candidates, 3);

  if (topPicks.length === 0) {
    console.log('All recent top stories have already been dispatched.');
    return;
  }

  console.log(`Found ${topPicks.length} fresh top stories to distribute.`);

  // 1. OneSignal Web Push: Top 2 stories (Deals or Breaking News)
  for (const article of topPicks.slice(0, 2)) {
    console.log(`-> OneSignal Push: "${article.title}"`);
    await sendOneSignal(article, isDryRun);
  }

  // 2. Telegram Broadcast: STRICTLY Deals, Offers, Discounts & Monetized Affiliate Posts
  const telegramDeals = pickTelegramDeals(candidates, 4);
  if (telegramDeals.length > 0) {
    console.log(`Found ${telegramDeals.length} fresh monetized deals to broadcast to Telegram.`);
    for (const deal of telegramDeals) {
      console.log(`-> Telegram Deal Post: "${deal.title}"`);
      await sendTelegram(deal, isDryRun);
      if (!isDryRun) {
        dispatched.push(deal.slug || deal.url);
      }
    }
  } else {
    console.log('No fresh deal/discount articles in this run for Telegram (skipping generic news to keep Telegram 100% Deals-focused).');
  }

  if (!isDryRun) {
    saveDispatched(dispatched);
  }

  console.log('Distribution completed successfully.');
}

// Run CLI if invoked directly
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.warn('Distribution encountered an unhandled error but exited safely:', err.message);
    process.exit(0);
  });
}
