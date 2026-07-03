# Emotion Journal (Research Study)

A separate daily journal for 4 participants over a 30-day study period. Lives under `journal/` and does **not** modify the existing Photon control site.

## URLs

| Who | URL |
|-----|-----|
| Participant 1 | `/journal/p1.html` |
| Participant 2 | `/journal/p2.html` |
| Participant 3 | `/journal/p3.html` |
| Participant 4 | `/journal/p4.html` |
| Researcher hub | `/journal/` |
| Admin + CSV export | `/journal/admin.html` |

Give each participant their own link — no login or password needed.

## Features

- **4 private journal URLs** — one per participant
- **Same questions every day** for 30 days (configurable)
- **Auto-save** — answers save automatically as they type or select
- **Past entries** — visible every time they open their link
- **Progress tracker** — current day, days remaining, entries completed
- **Admin view** — see all 4 participants' logs
- **CSV export (admin only)** — download all data for analysis

## Setup

### 1. Edit your questions

Open `api/journal/_config.js` and edit the `QUESTIONS` array. Supported field types:

- `scale` — numeric rating (e.g. 1–10)
- `textarea` — long text
- `text` — short text
- `yesno` — Yes / No buttons

Also set `STUDY_START_DATE` and `STUDY_DURATION_DAYS` (default 30).

### 2. Persistent storage (production)

Connect **Vercel KV** in your Vercel project (Storage → KV). Vercel sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.

**Local development** without KV: entries save to `journal/.data/journal.json` (gitignored).

### 3. Run locally (no Vercel login)

```bash
cd /Users/summerchao/Desktop/Photon/v1/web
node serve-local.mjs
```

Then open http://localhost:3000/journal/p1.html (or p2–p4, admin.html).

## Optional env vars

```
JOURNAL_STUDY_START_DATE=2026-07-02
JOURNAL_STUDY_DAYS=30
JOURNAL_TIMEZONE=America/New_York
```
