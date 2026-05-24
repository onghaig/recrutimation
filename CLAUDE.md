# Recruiting automation tool — engineering outline

---

## Overview

A full-stack recruiting tool that ingests candidates from Indeed and LinkedIn via a browser extension, scores them with an AI pipeline, presents them in a swipe-style review dashboard, and manages outreach and ATS logging. Built to automate the first-pass filtering and contact workflow for a staffing agency placing light industrial / assembly workers.

---

## System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension                                               │
│  ├── Content script (Indeed)                                    │
│  ├── Content script (LinkedIn)                                  │
│  └── Background service worker → POST /api/ingest              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  Backend API  (Python / FastAPI)                                │
│  ├── /api/jobs          — CRUD for open roles                   │
│  ├── /api/ingest        — receive candidates from extension     │
│  ├── /api/candidates    — list, filter, update decisions        │
│  ├── /api/score         — trigger / re-run AI scoring           │
│  ├── /api/outreach      — draft, confirm, send messages         │
│  └── /api/ats           — log to ATS, create PCF               │
└──────┬──────────────────┬───────────────────────────────────────┘
       │                  │
┌──────▼──────┐    ┌──────▼──────────────────────────────────────┐
│  PostgreSQL │    │  AI Scoring Pipeline                         │
│  ├─ jobs    │    │  ├── Embed job description  (text-embedding) │
│  ├─ cands   │    │  ├── Embed candidate resume (text-embedding) │
│  ├─ decisns │    │  ├── Cosine similarity → match score         │
│  └─ outreach│    │  ├── Willingness estimator  (LLM)            │
└─────────────┘    │  └── One-line summary       (LLM)            │
                   └─────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  Object Storage  (S3 / Cloudflare R2)                            │
│  └── PDF resumes keyed by candidate_id                           │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  Frontend  (React + Vite)                                        │
│  ├── Swipe deck view                                             │
│  ├── Results grid (Keep / Pin / Skip)                            │
│  ├── Outreach flow (draft → confirm → send)                      │
│  └── Job management panel                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Fast dev, easy state management |
| Styling | Tailwind CSS | Utility-first, mobile-friendly |
| Backend | Node.js + Fastify | Fast, low overhead, good TS support |
| ORM | Prisma | Type-safe DB access, easy migrations |
| Database | PostgreSQL | Relational, handles joins across jobs/candidates well |
| Object storage | Cloudflare R2 | S3-compatible, cheap egress, simple setup |
| AI — embeddings | OpenAI `text-embedding-3-small` | Fast, cheap, high quality |
| AI — LLM | Claude Sonnet (Anthropic API) | Willingness scoring + summary generation |
| Browser extension | Manifest V3 (Chrome) | Current standard, works on Chrome/Edge |
| Auth | Clerk or Auth.js | Simple auth, multiple users if needed |
| Queue | BullMQ + Redis | Async scoring jobs without blocking ingestion |
| Hosting | Railway or Render | Simple deploys, managed Postgres included |

---

## Phase 1 — Paste-and-parse MVP  (week 1–2)

Validate the AI scoring before writing any scraping code.

### What to build

- **Paste input UI** — text area where recruiter pastes a candidate's profile text (copied from Indeed or LinkedIn) alongside a job description
- **Parse endpoint** `POST /api/parse` — sends raw text to Claude, returns structured candidate object (name, phone, email, jobs array, skills array)
- **Scoring endpoint** `POST /api/score` — takes structured candidate + job description, returns match score, willingness score, one-line summary
- **Basic card display** — show the scored result in the swipe card UI

### Acceptance criteria

- Paste a real candidate → get a structured card with scores in < 5 seconds
- Scores align with recruiter's intuition on 10 real candidates
- Recruiter can make a keep/pin/skip decision and it saves to the database

---

## Phase 2 — Core product  (week 3–6)

### 2a. Database schema

```sql
-- Jobs
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  location    TEXT,
  pay_range   TEXT,
  platform    TEXT,          -- 'indeed' | 'linkedin'
  platform_id TEXT,          -- external job ID
  status      TEXT DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Candidates
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID REFERENCES jobs(id),
  source        TEXT,         -- 'indeed' | 'linkedin' | 'paste'
  source_id     TEXT,         -- platform's candidate ID
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  location      TEXT,
  distance_mi   NUMERIC,
  resume_last_active DATE,
  raw_text      TEXT,         -- full parsed resume text
  jobs_json     JSONB,        -- array of {role, employer, start, end, detail}
  skills_json   JSONB,        -- array of strings
  pdf_key       TEXT,         -- R2 object key, nullable
  match_score   INTEGER,      -- 0–100
  willing_score INTEGER,      -- 0–100
  ai_summary    TEXT,
  flags_json    JSONB,        -- array of flag strings
  scored_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Decisions
CREATE TABLE decisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id),
  job_id       UUID REFERENCES jobs(id),
  decision     TEXT,          -- 'keep' | 'pin' | 'skip'
  pin_note     TEXT,          -- optional note when pinning
  pin_remind   DATE,          -- optional follow-up date
  decided_at   TIMESTAMPTZ DEFAULT now()
);

-- Outreach
CREATE TABLE outreach (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id),
  job_id       UUID REFERENCES jobs(id),
  channel      TEXT,          -- 'indeed_message' | 'linkedin_message' | 'sms' | 'call'
  draft        TEXT,
  sent_at      TIMESTAMPTZ,
  response     TEXT,          -- 'replied' | 'no_response' | 'not_interested'
  credited     BOOLEAN DEFAULT false  -- tracks contact credit usage
);

-- ATS log
CREATE TABLE ats_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id),
  job_id       UUID REFERENCES jobs(id),
  ats_id       TEXT,          -- external ATS record ID
  stage        TEXT,          -- 'submitted' | 'interviewing' | 'hired' | 'pcf_created'
  logged_at    TIMESTAMPTZ DEFAULT now(),
  notes        TEXT
);
```

### 2b. API endpoints

```
GET    /api/jobs                       — list all open jobs
POST   /api/jobs                       — create job
GET    /api/jobs/:id/candidates        — list candidates for a job, sorted by match_score
POST   /api/ingest                     — receive candidate batch from extension
POST   /api/candidates/:id/score       — (re)score a single candidate
GET    /api/candidates/:id/pdf         — presigned R2 URL for PDF
POST   /api/candidates/:id/decision    — save keep/pin/skip + optional pin note
POST   /api/outreach/draft             — generate draft message for candidate
POST   /api/outreach/send              — mark as sent (does not auto-send)
GET    /api/outreach/:candidateId      — outreach history for candidate
POST   /api/ats/log                    — create ATS entry
POST   /api/ats/pcf                    — create PCF record on hire
```

### 2c. AI scoring pipeline

Run asynchronously via BullMQ so ingestion is non-blocking.

**Step 1 — Embed**
```
job_embedding       = embed(job.description)
candidate_embedding = embed(candidate.raw_text)
match_score         = cosine_similarity(job_embedding, candidate_embedding) * 100
```

**Step 2 — Willingness score**

Send to Claude with this prompt structure:
```
You are assessing whether a job candidate is likely to accept and stay in a role.

Job: {title}, {pay_range}, {location}
Candidate's most recent role: {role} at {employer}, {duration}
Candidate's full job history: {jobs_json}
Distance from job: {distance_mi} miles
Resume last active: {resume_last_active}

Score from 0–100 how likely this candidate is to:
1. Respond to outreach
2. Accept the role if offered
3. Stay past 30 days

Return JSON only: { "willing_score": number, "flags": string[], "reasoning": string }

Penalise heavily for: overqualification, large pay gap upward, long commute for low-wage role,
resume inactive > 3 months, very recent job start (they just started somewhere else).
Reward: exact title match, local, recently active, similar pay history, gaps in employment.
```

**Step 3 — Summary**

Single sentence, factual, recruiter-facing:
```
Summarise this candidate in one sentence for a recruiter.
Be specific: mention years of experience, most relevant role, and any key risk factors.
Do not use filler phrases. Max 20 words.
```

**Step 4 — Store**

Write `match_score`, `willing_score`, `ai_summary`, `flags_json`, `scored_at` back to the candidates table.

---

## Phase 3 — Browser extension  (week 5–8)

### File structure

```
extension/
├── manifest.json
├── background.js          — service worker
├── content/
│   ├── indeed.js          — DOM reader for Indeed employer dashboard
│   └── linkedin.js        — DOM reader for LinkedIn Talent
├── popup/
│   ├── popup.html
│   └── popup.js           — sync status, job selector
└── utils/
    └── api.js             — authenticated POST to /api/ingest
```

### manifest.json (key permissions)

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://employers.indeed.com/*",
    "https://www.linkedin.com/talent/*"
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["https://employers.indeed.com/*"],
      "js": ["content/indeed.js"]
    },
    {
      "matches": ["https://www.linkedin.com/talent/*"],
      "js": ["content/linkedin.js"]
    }
  ]
}
```

### Indeed content script — what to extract

Target: the applicant list page at `employers.indeed.com/jobs/:id/applicants`

```js
// Selectors (will need updating when Indeed changes their DOM)
const CARD_SELECTOR   = '[data-testid="applicant-card"]'
const NAME_SELECTOR   = '[data-testid="applicant-name"]'
const TITLE_SELECTOR  = '[data-testid="applicant-headline"]'
const SNIPPET_SEL     = '[data-testid="resume-snippet"]'
const LOCATION_SEL    = '[data-testid="applicant-location"]'
const UPDATED_SEL     = '[data-testid="resume-updated"]'
const INDEED_ID_SEL   = 'a[href*="/applicants/"]' // extract ID from href

// Run on page load and on DOM mutation (SPA navigation)
function scrapeApplicants() {
  return [...document.querySelectorAll(CARD_SELECTOR)].map(card => ({
    source:       'indeed',
    source_id:    extractId(card.querySelector(INDEED_ID_SEL)?.href),
    name:         card.querySelector(NAME_SELECTOR)?.innerText.trim(),
    title:        card.querySelector(TITLE_SELECTOR)?.innerText.trim(),
    snippet:      card.querySelector(SNIPPET_SEL)?.innerText.trim(),
    location:     card.querySelector(LOCATION_SEL)?.innerText.trim(),
    last_active:  card.querySelector(UPDATED_SEL)?.innerText.trim(),
  }))
}
```

Then POST the array + the current job's `platform_id` to `/api/ingest`.

### LinkedIn content script

LinkedIn's DOM is more obfuscated and updates frequently. Strategy:

1. Intercept XHR/fetch responses using a proxy on `XMLHttpRequest.prototype.open` — LinkedIn loads candidate data as JSON in API calls, which is more stable than scraping rendered HTML
2. Parse the JSON response to extract profile fields
3. Fall back to DOM scraping if the response structure changes

This is the harder of the two and should be treated as a separate workstream.

### PDF ingestion

When the recruiter opens an individual applicant's profile page:
- Content script detects a PDF resume link
- Downloads the PDF blob via `fetch()` using the recruiter's active session cookies
- Posts the blob to `POST /api/candidates/:id/pdf` as `multipart/form-data`
- Backend uploads to R2, stores the object key on the candidate record

---

## Phase 4 — Outreach flow  (week 7–9)

### Draft generation

```
POST /api/outreach/draft
Body: { candidate_id, job_id }
```

Claude generates a short, natural outreach message:

```
Write a brief recruiting outreach message.
Keep it under 4 sentences. Friendly, not salesy. 
Do not mention the company name. Do not use templates or filler phrases.

Job: {title} in {location}, {pay_range}
Candidate's name: {first_name}
Most relevant experience: {most_recent_role} at {employer}
Why they're a fit: {ai_summary}
```

The draft is saved to the `outreach` table with `sent_at = null`.

### Send flow (UI)

1. Recruiter taps "Keep" → outreach draft screen appears
2. Draft message shown in editable text area
3. Recruiter edits if needed → taps "Looks good, send"
4. Backend marks `sent_at = now()` and `credited = true` — does NOT auto-send to Indeed/LinkedIn
5. Recruiter manually pastes/sends via the platform (contact credits are too valuable to auto-spend without review)

Future: if the browser extension can inject the message into the Indeed/LinkedIn compose box and trigger send, that removes the manual step. Treat as a v2 feature.

---

## Phase 5 — ATS integration  (week 9–11)

### Auto-log on Keep

When a candidate is marked Keep and outreach is confirmed, automatically:

```js
POST /api/ats/log
{
  candidate_id,
  job_id,
  stage: 'submitted',
  notes: ai_summary
}
```

### Pin for later

When pinned, log to ATS with stage `'pinned'` and store the pin note + remind date. A daily cron job checks for candidates whose `pin_remind` date is today and surfaces them in the dashboard.

### PCF creation on hire

```
POST /api/ats/pcf
Body: { candidate_id, job_id, hire_date, client_name }
```

Generates a PCF record (placement confirmation file) with hire date, candidate info, job info, and client. Stored in the ATS log with `stage: 'pcf_created'`. Can also generate a PDF PCF document using the pdf skill.

### ATS platform integration

Most ATS systems (Bullhorn, JobDiva, PCRecruiter) expose a REST API. For each:

1. Get API credentials from the ATS settings panel
2. Map your internal `candidates` fields to their schema
3. POST on each stage change

If the ATS has no API, the fallback is a CSV export from `ats_log` that can be imported manually — still far better than nothing.

---

## Data flow — end to end

```
1. Recruiter opens Indeed applicant list
         │
2. Extension content script reads DOM → scrapes candidate cards
         │
3. POST /api/ingest → candidates written to DB (unscored)
         │
4. Ingest handler pushes score job to BullMQ queue
         │
5. Worker picks up job → embeds resume + job description
         → computes match score (cosine similarity)
         → calls Claude for willingness score + summary
         → writes scores back to candidates table
         │
6. Recruiter opens dashboard → GET /api/jobs/:id/candidates
         → sorted by match_score desc
         → swipe deck loads top N candidates
         │
7. Recruiter swipes through cards
         → PDF button fetches presigned R2 URL inline
         → Decision saved via POST /api/candidates/:id/decision
         │
8. After all cards reviewed → results grid rendered
         │
9. Recruiter taps Keep card → outreach draft screen
         → GET /api/outreach/draft → Claude generates message
         → Recruiter confirms → POST /api/outreach/send
         → ATS auto-logged → POST /api/ats/log
         │
10. Client reviews → interview scheduled → hire
         → POST /api/ats/pcf
```

---

## Build order

| Week | Milestone |
|---|---|
| 1 | Paste-and-parse MVP — validate AI scoring with real candidates |
| 2 | Swipe deck + results grid UI fully wired to backend |
| 3 | Job management, decisions persisted to DB |
| 4 | PDF upload + R2 storage + inline PDF viewer |
| 5 | Indeed browser extension — applicant list scraping |
| 6 | Outreach draft + confirm flow |
| 7 | ATS logging — auto-log on keep, pin remind cron |
| 8 | PCF generation |
| 9 | LinkedIn extension (harder — budget 2 weeks) |
| 10 | Polish, error handling, mobile testing |

---

## Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Indeed/LinkedIn change their DOM → extension breaks | Pin CSS selectors to `data-testid` attributes (more stable than class names). Set up a weekly smoke test. |
| AI scores don't match recruiter intuition | Start with paste-and-parse, tune prompts on 20 real candidates before shipping to production |
| Contact credits wasted on bad candidates | Never auto-send — always require recruiter confirmation before marking `credited = true` |
| LinkedIn bans extension account | Use DOM reading only (not fetch interception) for v1. Do not simulate rapid navigation. Add random delays. |
| ATS API unavailable | Ship CSV export fallback on day one; API integration is an enhancement |
| PDF access blocked by platform auth | Only download PDFs while recruiter is actively browsing — use their live session cookies, not stored credentials |

---

## Directory structure

```
recruiting-tool/
├── extension/              — Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content/
│   │   ├── indeed.js
│   │   └── linkedin.js
│   └── popup/
├── backend/                — Fastify API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── jobs.ts
│   │   │   ├── candidates.ts
│   │   │   ├── ingest.ts
│   │   │   ├── outreach.ts
│   │   │   └── ats.ts
│   │   ├── workers/
│   │   │   └── scorer.ts   — BullMQ worker
│   │   ├── ai/
│   │   │   ├── embed.ts    — OpenAI embeddings
│   │   │   ├── score.ts    — willingness + summary
│   │   │   └── draft.ts    — outreach message
│   │   ├── storage/
│   │   │   └── r2.ts       — PDF upload/presign
│   │   └── db/
│   │       └── prisma/
│   │           └── schema.prisma
│   └── package.json
├── frontend/               — React + Vite
│   ├── src/
│   │   ├── views/
│   │   │   ├── SwipeDeck.tsx
│   │   │   ├── ResultsGrid.tsx
│   │   │   ├── OutreachFlow.tsx
│   │   │   └── JobManager.tsx
│   │   ├── components/
│   │   │   ├── CandidateCard.tsx
│   │   │   ├── PdfViewer.tsx
│   │   │   └── ScoreChip.tsx
│   │   └── api/
│   │       └── client.ts
│   └── package.json
└── README.md
```

---

## Environment variables

```env
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=recruiting-pdfs

# Frontend
VITE_API_URL=https://your-api.railway.app
```

---

*Last updated: May 2026*