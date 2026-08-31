# Multi-Channel Distribution & Push Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an automated, zero-cost RSS feed generator, OneSignal Web Push SDK integration, and a modular multi-channel distribution dispatcher script in GitHub Actions.

**Architecture:** Extend `scripts/build-index.mjs` to output standard RSS 2.0 (`feed.xml`), create a standalone `scripts/distribute.mjs` to broadcast top stories/deals to OneSignal/Telegram/Pinterest without blocking builds, and add OneSignal Web Push prompt to HTML templates.

**Tech Stack:** Node.js (ESM), XML (RSS 2.0 / Atom), OneSignal REST API, Telegram Bot API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-31-distribution-dispatcher-design.md`

## Global Constraints

- Never break or block the core article generation in `auto-news.yml`.
- All external API calls must timeout within 5 seconds and exit code 0 on failure.
- Avoid duplicate broadcasts by storing sent IDs in `data/dispatched.json`.
- No hardcoded API keys; all credentials read from `process.env`.
- Maintain 100/100 Core Web Vitals and Best Practices.

---

### Task 1: RSS 2.0 & Atom Feed Generation

**Files:**
- Modify: `scripts/build-index.mjs`
- Test: `test/rss-feed.test.mjs`

**Interfaces:**
- Consumes: `published` article objects from `build-index.mjs`
- Produces: `public/feed.xml` and `public/rss.xml` (RSS 2.0 standard)

- [ ] **Step 1: Write test for RSS XML generator**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement RSS 2.0 generation in `scripts/build-index.mjs`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Multi-Channel Dispatcher Module

**Files:**
- Create: `scripts/distribute.mjs`
- Test: `test/distribute.test.mjs`

**Interfaces:**
- Consumes: `data/` or `public/feed-latest.json`
- Produces: Dispatches to OneSignal REST API / Telegram / Pinterest, updates `data/dispatched.json`

- [ ] **Step 1: Write test for story ranking and deduplication logic**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `scripts/distribute.mjs` with dry-run support**
- [ ] **Step 4: Run test to verify passing behavior**
- [ ] **Step 5: Commit changes**

---

### Task 3: GitHub Actions Workflow Integration

**Files:**
- Modify: `.github/workflows/auto-news.yml`

**Interfaces:**
- Consumes: Secrets `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
- Produces: Runs `node scripts/distribute.mjs` after site build and health check

- [ ] **Step 1: Add distribution step to `.github/workflows/auto-news.yml`**
- [ ] **Step 2: Verify YAML syntax and execution safety**
- [ ] **Step 3: Commit workflow update**

---

### Task 4: Frontend OneSignal Web Push Integration

**Files:**
- Modify: `index.html`, `category.html`, `scripts/lib/template.mjs`

**Interfaces:**
- Consumes: Optional OneSignal App ID
- Produces: Non-blocking Web Push subscription prompt on frontend

- [ ] **Step 1: Add asynchronous OneSignal SDK loading to HTML templates**
- [ ] **Step 2: Verify zero layout shift (CLS) and deferred execution**
- [ ] **Step 3: Commit frontend changes**

---

### Task 5: End-to-End Build and Verification

**Files:**
- Run local build test: `npm run build`
- Run distribution test: `node scripts/distribute.mjs --dry-run`

- [ ] **Step 1: Execute full build and verify all XML feeds and distribution logs**
- [ ] **Step 2: Commit any final artifacts and push to origin main**
