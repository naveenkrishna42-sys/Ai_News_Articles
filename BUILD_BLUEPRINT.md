# TIVRA — Gadget Articles + Auto-Video Pipeline
## Build roadmap (v2 — manual YouTube upload)

**Who does what:**

| Role | Who | When | Cost |
|---|---|---|---|
| Plan + monitor + review | Opus (this doc) | now, and at each phase gate | one-off |
| **Build the pipeline** | **Haiku 4.5**, with Sonnet 5 on 4 named tasks | once | one-off |
| **Run the pipeline daily** | Groq / Gemini / OpenRouter (free tiers) | forever, unattended | ₹0 |
| Upload videos to YouTube | **You, manually, 11am daily** | forever | ₹0 |

Claude is never in the daily loop. Once built, the recurring cost of this
system is zero, aside from optional paid-provider fallback.

**How to keep build tokens low:** every task below is written to be executed
without asking follow-up questions. That precision is deliberate — it is what
lets Haiku do 27 of the 31 tasks. If a task turns out to be ambiguous in
practice, that is a defect in this document; report it back rather than
burning Sonnet tokens improvising.

---

## 1. What manual upload buys you

Deciding to upload by hand deletes three hard problems from v1 of this plan:

| Problem in v1 | Status now |
|---|---|
| YouTube API compliance audit — videos force-locked to private for weeks | **Gone.** No API, no audit. |
| OAuth refresh tokens, scopes, token expiry in CI | **Gone.** ~4 build tasks deleted. |
| API quota accounting | **Gone.** |
| Videos committed to git / artifact bloat | **Gone** — see §2, videos render on your PC. |

It also means **you review every video before it goes public**, which is
genuinely the right call for a monetized channel. Fully unattended upload of
9 templated videos/day from a brand-new channel is the exact pattern YouTube's
inauthentic-content systems look for. Your hand on the publish button is a
feature, not a compromise.

**Cost of the tradeoff:** 10–15 minutes of your time daily, and you must paste
the video URLs back so articles can embed them (§5, task V7 — one line of typing).

---

## 2. Architecture: two loops, deliberately separate

```
LOOP A — ARTICLES (cloud, unattended, PC can be off)
  GitHub Actions, existing schedule
    fetch feeds → pick topics → free LLM writes article JSON
    → images → render HTML → commit → Cloudflare rebuilds
  Output: 9 live articles/day

LOOP B — VIDEOS (your PC, one command, when you're ready to upload)
  npm run video:today
    reads today's gadget articles from the repo
    → free LLM writes narration script
    → local TTS makes voiceover        (free, offline)
    → HTML scene cards → PNG frames    (reuses site CSS)
    → ffmpeg assembles mp4             (free, offline)
    → writes /video-out/ : mp4 + thumbnail + title + description
  You: open /video-out/, upload 9 videos to YouTube, paste URLs into one file
    → next Actions run patches the embeds into the articles
```

**Why videos render locally, not in GitHub Actions:** you're already at the
computer at 11am to upload. Local rendering means zero Actions minutes, no
artifact size limits, no repo bloat, no 6-hour job timeout, and you can
re-render one video instantly if it looks wrong. GitHub Actions video
rendering would have cost ~1,000+ minutes/month against a 2,000-minute free
tier, for no benefit given you're present anyway.

Loop A stays in the cloud because articles must publish whether your PC is on
or not. **Loop B failing must never affect Loop A.** Separate scripts,
separate entry points, no shared state beyond the article JSON files.

**Local prerequisites (one-time):** Node 24 (already required), ffmpeg, and
Python for the TTS model. All free. Task V1 writes the setup script.

---

## 3. Copyright: the honest version

You said "original image extract from the phones websites" and "no copyright"
in the same sentence. Those two things are in direct conflict, and this is the
one place in the plan where I need to push back rather than just build what
was asked.

**Manufacturer product photos are copyrighted.** Samsung's press render of the
S25 Ultra is Samsung's property. Scraping it off samsung.com and putting it in
a monetized YouTube video is infringement, whether or not anyone notices.
Press kits sometimes grant editorial-use permission, but the terms differ per
manufacturer, often exclude monetized use, and cannot be safely automated
across brands. For a site you're about to put AdSense on and a channel you
want in the Partner Programme, this is the thing that gets the account
terminated — not a hypothetical.

**Here is what is genuinely free, and it covers most of what you need:**

**Specifications are facts, and facts are not copyrightable.** Screen size,
chipset, battery mAh, price, camera megapixels — you can state these freely
no matter where you read them. What you cannot do is copy someone's *written
review prose* or lift their *entire spec table verbatim as a compilation*. So:
gather spec values from 2–3 sources, cross-check them, and emit your own
table. That is 100% legal and it is the substance of your content.

**This is why your chosen video format is actually smart.** A white-paper spec
reveal — clean background, specs animating in one line at a time — is mostly
*facts and typography*, which are free. The photo is a small part of the
frame. You accidentally picked the most copyright-safe format available.

**For the device photos, the cascade (in order):**

1. **Wikimedia Commons** — CC/public-domain, has real photos of most mainstream
   phones. Requires printing a credit line. Free.
2. **Openverse** — ~800M CC-licensed items, indexes Commons + Flickr + more.
   Wider net for devices Commons misses. Free.
3. **Unsplash** — commercial use permitted, high quality, but generic device
   shots rather than specific models. Free API key.
4. **Pexels / Pixabay** — already wired, generic.
5. **Generated outline card** — if all of the above miss (very new launches),
   render a clean typographic card with the device name and key specs instead
   of a photo. No image is always better than an infringing image.

Attribution is not optional on tiers 1–2. Task I5 prints the credit line on
the page; task V6 puts it in the video's corner and description.

**What I will not build:** a scraper that pulls images off manufacturer or
review sites. If you want to use a specific press image, check that
manufacturer's press-kit terms yourself and drop the file into a manual
`assets/devices/` folder — the pipeline will use anything it finds there
first, on your authority. That keeps the decision human and documented.

---

## 4. Video format spec (from your description)

Two formats. Both 1080p, white/light background, clean typographic reveal.

### Format A — Single device review

```
Scene 1  Title card          device name, price, TIVRA logo          0-4s
Scene 2  Device photo        full frame, name overlay, credit line   4-10s
Scene 3  Spec sheet page 1   white paper, specs reveal line-by-line  10-25s
           (display, chipset, RAM/storage — one line every ~2s)
Scene 4  Device photo 2      different angle if available            25-30s
Scene 5  Spec sheet page 2   camera, battery, charging, OS           30-45s
Scene 6  Device photo 3                                              45-50s
Scene 7  Verdict card        who it's for, 3 bullet reveal           50-65s
Scene 8  Outro               subscribe + tivra article link          65-70s
```

Your rule — *use as many photos as available, alternating photo page and spec
page, next photo after each page completes* — is encoded as: alternate
photo/spec scenes, consuming photos in order until either photos or spec
groups run out; whichever runs out first, continue with the other.

### Format B — Two-device comparison

```
Scene 1  Hook                "Which should you actually buy?"        0-5s
Scene 2  Split title         screen halved, device A | device B      5-11s
           each side: cropped device photo, name, price
Scene 3  Split spec table    row reveals one at a time, both         11-45s
           columns simultaneously; winning value highlighted
Scene 4  Split photo pair    next photo of each device, side by side 45-52s
Scene 5  Split spec table 2  remaining spec rows                     52-75s
Scene 6  Verdict             "Buy A if… / Buy B if…"                 75-95s
Scene 7  Outro                                                       95-100s
```

Split-screen: exact 50/50 vertical divide, each device photo centre-cropped to
fill its half with ~8% padding, consistent scale between the two so neither
device looks artificially bigger.

**Reveal timing rule:** each spec line's on-screen appearance is synced to the
narration mentioning it — the TTS module returns per-line audio durations
(task V3), and ffmpeg uses those, not fixed timings. This is what makes it
look produced rather than a slideshow on a timer.

**Voiceover:** Kokoro (82M, Apache 2.0) primary, Piper (MIT) fallback. Both
run offline on your PC, both explicitly permit commercial use, both free, no
API key, no per-character cost. Avoid `edge-tts` — good voices but it's an
unofficial wrapper around a Microsoft endpoint with no clear commercial grant.

**Music:** optional, off by default. If enabled, YouTube Audio Library
no-attribution tracks only. Background music is the most common way a clean
auto-channel picks up a strike.

---

## 5. Task list

**Model tags:** `[H]` Haiku 4.5 · `[S-lo]` Sonnet 5 low · `[S-med]` Sonnet 5 medium.
Only 4 tasks need Sonnet — auth-free architecture and prompt design, where a
wrong answer is expensive to discover three phases later.

### Phase I — Images (6 tasks, 1 Sonnet)

- **I1 [H]** `scripts/lib/images/wikimedia.mjs` — Commons API search. Returns
  `{url,width,height,license,author,sourceUrl}|null`. Images ≥800px wide.
  Licence/author from `extmetadata`. Never throws.
- **I2 [H]** `scripts/lib/images/openverse.mjs` — same interface, Openverse
  `/v1/images/`, commercial-use licences only.
- **I3 [H]** `scripts/lib/images/unsplash.mjs` — same interface, needs
  `UNSPLASH_ACCESS_KEY`, skips cleanly if absent.
- **I4 [S-lo]** `scripts/lib/images/index.mjs` — cascade orchestrator + **query
  degradation ladder**: exact model → drop variant → brand + category →
  category. Per-run cache. Judgement task: knowing when a result is "close
  enough" vs when to degrade further.
- **I5 [H]** Attribution in article template — `<figcaption>` prints
  `Photo: {author} / {provider} ({license})`, linked. Must render cleanly for
  existing articles that have none of these fields.
- **I6 [H]** Point `reimage.mjs` at the new cascade.
- **I7 [H]** Manual override folder — `assets/devices/{slug}/*.jpg` checked
  before the cascade (see §3).

### Phase A — Articles, 9/day (7 tasks, 3 Sonnet)

- **A1 [H]** `config/news-config.json` — add `Gadget Comparisons`,
  `Sacred Places`, `AI Tips & Tools`, 3/day each, with feeds. Add to
  `featuredCategories`. Check `volume.dailyCap` still fits.
- **A2 [S-med]** **Spec-fact prompt + accuracy guard.** The most important
  task in the build. Prompt returns strict JSON:
  `{title,intro,devices[],specRows[],summary,verdict,keyPoints[],seoDescription}`
  where `specRows[] = {label,valueA,valueB,confidence}`. Two non-negotiables:
  the model must emit `null` for any spec it isn't confident of (renderer
  prints "—"), and it must never reproduce review prose from a source. A
  comparison table of confidently-wrong numbers is what gets a site classed
  as unhelpful content and rejected by AdSense. Medium effort because getting
  a free-tier model to reliably admit uncertainty takes iteration.
- **A3 [S-lo]** Ranking/listicle prompt variant — "top 10 under ₹30,000",
  "best value for money", "most expensive". Needs a stated, defensible ranking
  rationale printed in the article, not an arbitrary order.
- **A4 [H]** Comparison table renderer — HTML/CSS matching existing article
  typography exactly (`#0b1220` headings, `#e11d48` accent). **Stacked-card
  layout below 600px** — a 2-column spec table on a 360px screen is the main
  mobile failure mode. Highlight winning value per row.
- **A5 [S-lo]** Temple + AI-tips prompts. Temples: evergreen longform
  (history, significance, visiting info), not news-of-the-day. AI tips:
  concrete step-by-step, specific and checkable, no generic AI-slop register.
- **A6 [H]** Category hub pages, auto-generated, wired into `build-index.mjs`.
- **A7 [H]** `Product` + `Review` schema.org on comparison articles alongside
  existing `NewsArticle` — drives rich results for exactly this content type.

### Phase V — Video, local (9 tasks, 0 Sonnet)

Format is fully specified in §4, so this whole phase is Haiku work.

- **V1 [H]** `scripts/video/setup.mjs` + docs — check/install ffmpeg, download
  and cache the Kokoro model, verify Node version. Idempotent, clear errors.
- **V2 [H]** Script generator — article JSON → per-scene
  `{narration, onScreenLines[], sceneType}` via the existing free provider
  pool. Narration must sound spoken: short sentences, no "in this article".
- **V3 [H]** `scripts/video/tts.mjs` — Kokoro primary, Piper fallback. Returns
  wav **plus per-line timing marks** (§4 reveal sync depends on this).
- **V4 [H]** Scene renderer — each scene as an HTML page screenshotted
  headlessly to 1920×1080 PNG. Reuses site CSS so video branding matches the
  site for free. Types: title, device-photo, spec-page, split-title,
  split-spec, verdict, outro.
- **V5 [H]** Reveal animation — spec lines appear one at a time, synced to V3
  timing marks. Implement as a PNG sequence (one frame per reveal state) fed
  to ffmpeg; simpler and more reliable than video filters.
- **V6 [H]** ffmpeg assembly — scenes + voiceover + optional music bed → 1080p
  H.264 mp4. Gentle Ken Burns on photo scenes, none on spec pages (text must
  stay crisp). Normalised audio. Attribution line bottom-left on photo scenes.
- **V7 [H]** Output + re-link loop — write `/video-out/{slug}/` containing
  `video.mp4`, `thumbnail.png`, `title.txt`, `description.txt`, plus a
  `video-urls.txt` you paste YouTube URLs into after uploading. Next Actions
  run reads it and patches the embed into the article. Closes the loop with
  one line of typing per video.
- **V8 [H]** Thumbnail — 1280×720, both devices, large "VS", price tags,
  readable at phone size.
- **V9 [H]** `npm run video:today` — the single command. Renders every gadget
  article published today, skips already-rendered, per-video timeout, cleans
  temp files, prints a summary. Must not touch git.

### Phase S — SEO / monetization (7 tasks, 1 Sonnet)

Highest leverage per hour in this document. The site already has canonicals,
OG/Twitter cards, NewsArticle JSON-LD, sitemaps, robots.txt, related links and
all required policy pages. What's missing is distribution.

- **S1 [you, manual]** Google Search Console + Bing Webmaster Tools — verify
  domain, submit sitemap. **15 minutes, do it first**, probably the single
  biggest ranking unlock available.
- **S2 [H]** IndexNow ping on publish — free, Bing/Yandex support it, pings
  new URLs instantly instead of waiting for a crawl.
- **S3 [H]** Google News sitemap — separate, last 48h, `news:` namespace.
- **S4 [you, manual]** Google Publisher Center application, once volume is
  stable. Discover traffic routinely exceeds organic search for news sites.
- **S5 [H]** AdSense wiring — `ADSENSE_PUBLISHER_ID`/`ADSENSE_AD_SLOT` are
  already threaded through the template but empty. Fill once approved, verify
  ads don't break mobile layout, confirm `ads.txt` matches.
- **S6 [S-lo]** Internal linking — auto-link device names to hub pages,
  cross-link comparisons sharing a device. Builds the topical authority that
  makes evergreen comparisons rank months later.
- **S7 [H]** Core Web Vitals — lazy-load below-fold images, explicit
  width/height to stop layout shift, preconnect to image CDNs.

### Totals

| Phase | Haiku | Sonnet lo | Sonnet med |
|---|---|---|---|
| I — Images | 6 | 1 | — |
| A — Articles | 4 | 2 | 1 |
| V — Video | 9 | — | — |
| S — SEO | 5 | 1 | — |
| **Total** | **24** | **4** | **1** |

**83% Haiku.** Sonnet is reserved for the five places where being wrong is
expensive: spec accuracy (A2), image cascade judgement (I4), ranking rationale
(A3), non-slop prose prompts (A5), internal-link strategy (S6).

**Could Haiku do all 31?** Probably 28 of them. A2 is the one I'd insist on
Sonnet for — getting a free-tier model to reliably say "I don't know" about a
spec number is genuinely fiddly, and every article for the life of the site
depends on it. The other four are cheap insurance; if you want to try Haiku
first on I4/A3/A5/S6 and escalate only on failure, that's a reasonable bet.

---

## 6. Build order and phase gates

Build in this order. **Stop at each gate and have me review before continuing**
— that's the monitoring role, and catching a bad pattern at gate 1 is far
cheaper than finding it at gate 4.

1. **S1 first** (15 min, manual) — indexing history starts accumulating from
   the moment you verify, so there's no reason to delay it.
2. **Phase I** → *Gate 1:* dry-run `"iPhone 17 Pro"` and 5 other devices.
   Real device photos with attribution, not generic stock. I review.
3. **Phase A** → *Gate 2:* one full run publishes 9 articles. I spot-check
   spec accuracy against real sources — this gate matters most. I review.
4. **Phase S** (S2–S3, S5–S7) — cheap, and improves everything already live.
5. **Phase V** → *Gate 3:* `npm run video:today` produces one watchable
   comparison video. You watch it end to end before we scale to 9.
6. **Ramp** — 2–3 videos/day for the first fortnight, then 9. Articles can go
   to 9/day immediately; the risk profile is different, and a new channel
   posting 9 templated videos daily is the pattern YouTube's spam systems flag.

**Optional, later:** the on-demand "compare these two phones" box for site
visitors (Cloudflare Worker). Deliberately dropped from this roadmap — it's a
new runtime with new abuse/spend risks, and it's worth nothing until the
daily pipeline is stable and earning. Revisit after launch.

---

## 7. My monitoring role

At each gate I check the things that are cheap to fix now and expensive later:

- **Spec accuracy** — sample 10 spec cells against real sources. Any invented
  number is a stop-the-line defect.
- **Copyright hygiene** — every image traced to a licence; no manufacturer
  photos; attribution rendering on page and in video.
- **Loop isolation** — confirm a video-side failure can't break article publishing.
- **Prose quality** — reads like a person, not a template. This is what
  separates AdSense approval from rejection.
- **Cost drift** — nothing quietly moved onto a paid tier.
- **Escalation log** — if Haiku fails a task twice, it goes to Sonnet low and
  I note it, so the estimates in §5 get corrected rather than repeated.

---

## Sources

- [Unsplash Image API](https://unsplash.com/developers) — licence terms
- [Wikimedia Commons free media resources](https://commons.wikimedia.org/wiki/Commons:Free_media_resources/Photography)
- [Best local TTS models 2026 — Kokoro / Piper licensing](https://localaimaster.com/blog/best-local-tts-models)
- [Local TTS commercial-use guide](https://www.promptquorum.com/power-local-llm/local-tts-voice-cloning-piper-coqui-xtts)
- [GitHub Actions free tier limits 2026](https://cicdcalculator.com/github-actions-free-tier)
