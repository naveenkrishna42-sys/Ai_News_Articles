# Multi-Channel Distribution & Push Notification Design Spec

**Date:** 2026-08-31  
**Target:** TIVRA News (Ai_News_Articles)  
**Objective:** Establish an automated, zero-cost audience distribution pipeline that pushes top-tier breaking news and affiliate deals directly to mobile and desktop users without algorithmic suppression or breaking the existing news build.

---

## 1. Context & Background

TIVRA News generates news and deal articles automatically via scheduled GitHub Actions (`auto-news.yml`) and deploys via Cloudflare Pages. While technical SEO (SSG, Canonical, Image CDN, Security Headers) is now at a 100/100 standard, relying solely on Google indexing takes weeks due to the new domain sandbox and Helpful Content evaluation. 

To create immediate, recurring organic traffic, we require:
1. Direct-to-consumer Web Push notifications (OneSignal integration).
2. Automated RSS 2.0 Syndication Feed (`feed.xml`) for news readers (Flipboard, Google News, Feedly).
3. A modular, non-blocking GitHub Actions distribution step (`scripts/distribute.mjs`) supporting Web Push, Telegram, and Pinterest dispatching.

---

## 2. System Architecture

```
                                  ┌──────────────────────────┐
                                  │   auto-news.yml Cron     │
                                  │ (Generates fresh articles│
                                  │    and runs build)       │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │  scripts/distribute.mjs  │
                                  └────────────┬─────────────┘
                                               │
                 ┌─────────────────────────────┼─────────────────────────────┐
                 ▼                             ▼                             ▼
   ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
   │ OneSignal Push Notifier  │  │   Telegram Channel Bot   │  │   Pinterest Pin Poster   │
   │ (Pushes top 1-2 deals/   │  │ (Posts deal card & link  │  │ (Pins 16:9 images with   │
   │ stories to subscribers)  │  │  if token configured)    │  │  affiliate link)         │
   └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

---

## 3. Subsystem Specifications

### 3.1 Subsystem A: RSS 2.0 & Atom Feed Generation
* **File:** `scripts/build-index.mjs`
* **Output:** `public/feed.xml` and `public/rss.xml`
* **Specification:**
  - Build standard XML with `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`.
  - Include channel metadata: Title, Link, Description, Language (`en-US`), LastBuildDate.
  - Generate `<item>` tags for the latest 50 published articles.
  - Include `<guid>`, `<title>`, `<link>`, `<description>`, `<pubDate>`, `<category>`, and `<enclosure url="..." type="image/jpeg" />` for feed readers.

### 3.2 Subsystem B: Frontend Web Push Integration (OneSignal SDK)
* **Files:** `index.html`, `category.html`, `scripts/lib/template.mjs`
* **Specification:**
  - Integrate official OneSignal SDK script asynchronously in `<head>`:
    ```html
    <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
    <script>
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "ONESIGNAL_APP_ID_PLACEHOLDER",
          safari_web_id: "",
          notifyButton: { enable: false }
        });
      });
    </script>
    ```
  - Configurable via `config.json` or fallback placeholder to avoid throwing if unconfigured.
  - Zero CLS: Use non-intrusive native browser permission prompt or soft banner.

### 3.3 Subsystem C: Modular Multi-Channel Dispatcher
* **File:** `scripts/distribute.mjs`
* **Execution:** Added as an isolated step in `.github/workflows/auto-news.yml` right after publishing.
* **Logic:**
  1. Inspects newly published articles within the last 4 hours (`data/` or git diff).
  2. Ranks candidate stories: prioritizes high-discount deals (Flipkart/Amazon/Cuelinks) and major breaking headlines.
  3. Dispatches payload to enabled targets:
     - **OneSignal REST API**: `https://onesignal.com/api/v1/notifications` using `ONESIGNAL_APP_ID` & `ONESIGNAL_REST_API_KEY`.
     - **Telegram Bot API**: `https://api.telegram.org/bot<TOKEN>/sendMessage` using `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHANNEL_ID`.
     - **Pinterest API**: Ready stub that checks for `PINTEREST_ACCESS_TOKEN` & `PINTEREST_BOARD_ID`.
  4. Non-blocking error handling: Any failed network call or missing credential logs a warning and exits code 0, ensuring the GitHub Actions run NEVER fails or gets stuck.

---

## 4. Security & Quality Guardrails

1. **No Hardcoded Secrets:** All external API keys MUST be read from `process.env`.
2. **Graceful Degrades:** If an API key is missing or an external API times out (5s timeout), the dispatcher logs a friendly message and continues.
3. **No Duplicate Spam:** Dispatcher records sent article URLs/slugs into `data/dispatched.json` to prevent re-notifying subscribers on subsequent runs.
4. **Performance Integrity:** Zero impact on mobile Core Web Vitals (LCP < 2.5s, CLS = 0, TBT < 200ms).

---

## 5. Testing & Verification Plan

- Unit test RSS XML output for well-formedness and valid date/link syntax.
- Mock test OneSignal, Telegram, and Pinterest dispatch functions with dry-run payloads.
- Verify `dispatched.json` state tracking prevents duplicate notifications.
