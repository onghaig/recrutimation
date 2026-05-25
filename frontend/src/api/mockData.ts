import type { Job, Candidate, Decision, Outreach, AtsLog, ParseResult } from '../types'

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-001',
    title: 'Assembly Line Worker',
    description:
      'Responsible for assembling electronic components on a fast-paced production line. Must follow safety protocols and hit daily quota targets. Previous manufacturing experience preferred.',
    location: 'Fremont, CA',
    payRange: '$16–$18/hr',
    platform: 'indeed',
    platformId: 'indeed-jb-4821',
    status: 'open',
    createdAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'job-002',
    title: 'Forklift Operator',
    description:
      'Operate sit-down and stand-up forklifts in a distribution center. Forklift certification required. Responsible for receiving, put-away, and order fulfillment. Must be comfortable working in a cold storage environment.',
    location: 'Oakland, CA',
    payRange: '$18–$21/hr',
    platform: 'indeed',
    platformId: 'indeed-jb-9034',
    status: 'open',
    createdAt: '2026-05-03T10:30:00Z',
  },
  {
    id: 'job-003',
    title: 'Warehouse Associate',
    description:
      'Pick, pack, and ship orders in a high-volume e-commerce fulfillment center. Standing 8–10 hours per shift, occasional heavy lifting (up to 50 lbs). No experience necessary — full training provided.',
    location: 'San Jose, CA',
    payRange: '$15–$17/hr',
    platform: 'linkedin',
    platformId: 'li-pos-77231',
    status: 'open',
    createdAt: '2026-05-10T08:15:00Z',
  },
]

// ── Decisions ─────────────────────────────────────────────────────────────────

export const MOCK_DECISIONS: Decision[] = [
  {
    id: 'dec-001',
    candidateId: 'cand-001',
    jobId: 'job-001',
    decision: 'keep',
    decidedAt: '2026-05-20T14:02:00Z',
  },
  {
    id: 'dec-002',
    candidateId: 'cand-002',
    jobId: 'job-001',
    decision: 'pin',
    pinNote: 'Lots of forklift exp but lives 35 mi away — follow up if closer role opens.',
    pinRemind: '2026-06-01',
    decidedAt: '2026-05-20T14:10:00Z',
  },
  {
    id: 'dec-003',
    candidateId: 'cand-003',
    jobId: 'job-001',
    decision: 'skip',
    decidedAt: '2026-05-20T14:15:00Z',
  },
  {
    id: 'dec-004',
    candidateId: 'cand-004',
    jobId: 'job-002',
    decision: 'keep',
    decidedAt: '2026-05-21T09:45:00Z',
  },
  {
    id: 'dec-005',
    candidateId: 'cand-006',
    jobId: 'job-002',
    decision: 'keep',
    decidedAt: '2026-05-21T10:00:00Z',
  },
]

// ── Candidates ────────────────────────────────────────────────────────────────

export const MOCK_CANDIDATES: Candidate[] = [
  // job-001 — kept
  {
    id: 'cand-001',
    jobId: 'job-001',
    source: 'indeed',
    sourceId: 'ind-a10023',
    name: 'Maria Santos',
    email: 'msantos@gmail.com',
    phone: '(510) 555-0142',
    location: 'Fremont, CA',
    distanceMi: 4,
    resumeLastActive: '2 days ago',
    rawText:
      'Maria Santos · Fremont CA · 5 years assembly and production experience · Currently seeking new opportunities · Reliable, detail-oriented team player',
    jobsJson: [
      { role: 'Assembly Technician', employer: 'Flex Ltd', start: '2022-03', end: null, detail: 'Soldered and tested PCB assemblies, maintained 99% first-pass quality rate.' },
      { role: 'Production Operator', employer: 'Benchmark Electronics', start: '2019-06', end: '2022-02', detail: 'Ran SMT pick-and-place machines, performed visual QC inspections.' },
    ],
    skillsJson: ['PCB assembly', 'SMT operations', 'Quality inspection', 'ESD handling', '5S', 'Lean manufacturing'],
    pdfKey: null,
    matchScore: 91,
    willingScore: 88,
    aiSummary: '5-yr assembly tech at Flex; strong SMT & QC background; 4 miles away and resume active 2 days ago.',
    flagsJson: [],
    scoredAt: '2026-05-20T13:55:00Z',
    createdAt: '2026-05-19T11:00:00Z',
    decisions: [MOCK_DECISIONS[0]],
  },

  // job-001 — pinned
  {
    id: 'cand-002',
    jobId: 'job-001',
    source: 'indeed',
    sourceId: 'ind-a10087',
    name: 'David Nguyen',
    email: 'd.nguyen@yahoo.com',
    phone: '(925) 555-0391',
    location: 'Livermore, CA',
    distanceMi: 34,
    resumeLastActive: '1 week ago',
    rawText: 'David Nguyen · Livermore CA · Forklift certified · 8 years warehouse + light manufacturing background',
    jobsJson: [
      { role: 'Material Handler / Forklift Op', employer: 'Amazon DSP', start: '2021-01', end: null, detail: 'Operated reach trucks, managed inbound freight, picked 300+ units/hr consistently.' },
      { role: 'Assembly Associate', employer: 'Jabil Circuit', start: '2017-04', end: '2020-12', detail: 'Hand assembly of cable harnesses; IPC-A-620 certified.' },
    ],
    skillsJson: ['Forklift (certified)', 'Reach truck', 'Cable harness assembly', 'IPC-A-620', 'SAP WM', 'RF scanner'],
    pdfKey: null,
    matchScore: 79,
    willingScore: 62,
    aiSummary: '8-yr warehouse/assembly mix; forklift certified but 34 mi commute on $16/hr is a risk.',
    flagsJson: ['Long commute for pay rate (34 mi)'],
    scoredAt: '2026-05-20T14:00:00Z',
    createdAt: '2026-05-19T11:05:00Z',
    decisions: [MOCK_DECISIONS[1]],
  },

  // job-001 — skipped
  {
    id: 'cand-003',
    jobId: 'job-001',
    source: 'indeed',
    sourceId: 'ind-a10199',
    name: 'Kevin Park',
    email: 'kpark88@hotmail.com',
    phone: '(408) 555-0874',
    location: 'San Jose, CA',
    distanceMi: 28,
    resumeLastActive: '4 months ago',
    rawText: 'Kevin Park · San Jose CA · Engineering background seeking manufacturing roles',
    jobsJson: [
      { role: 'Process Engineer', employer: 'Applied Materials', start: '2020-08', end: '2025-01', detail: 'Developed CVD process recipes, DOE experience, Python scripting.' },
      { role: 'Manufacturing Engineer Intern', employer: 'Lam Research', start: '2019-05', end: '2020-07', detail: 'Root cause analysis on yield excursions.' },
    ],
    skillsJson: ['Process engineering', 'DOE', 'CVD', 'Python', 'SPC', 'Six Sigma Green Belt'],
    pdfKey: null,
    matchScore: 38,
    willingScore: 24,
    aiSummary: 'Process engineer at Applied Materials — overqualified and likely seeking roles above $16/hr.',
    flagsJson: ['Significant overqualification', 'Resume inactive 4 months', 'Pay gap (likely expects $40+/hr)'],
    scoredAt: '2026-05-20T14:05:00Z',
    createdAt: '2026-05-19T11:10:00Z',
    decisions: [MOCK_DECISIONS[2]],
  },

  // job-002 — kept
  {
    id: 'cand-004',
    jobId: 'job-002',
    source: 'indeed',
    sourceId: 'ind-b20014',
    name: 'Tyrone Williams',
    email: 'twill_ops@gmail.com',
    phone: '(510) 555-0267',
    location: 'Oakland, CA',
    distanceMi: 2,
    resumeLastActive: '3 days ago',
    rawText: 'Tyrone Williams · Oakland CA · Certified forklift operator · Looking for new opportunity',
    jobsJson: [
      { role: 'Forklift Operator', employer: 'IKEA Distribution Center', start: '2020-09', end: '2025-04', detail: 'Operated sit-down, reach, and order-picker forklifts; received 5-star safety record.' },
      { role: 'Warehouse Associate', employer: 'UPS Supply Chain', start: '2018-02', end: '2020-08', detail: 'Loading/unloading, inventory cycle counts, RF scanning.' },
    ],
    skillsJson: ['Forklift (certified)', 'Reach truck', 'Order picker', 'Cold storage', 'RF scanner', 'Inventory management'],
    pdfKey: null,
    matchScore: 95,
    willingScore: 91,
    aiSummary: '7-yr forklift veteran, certified, 2 miles away, active resume — near-perfect fit for this role.',
    flagsJson: [],
    scoredAt: '2026-05-21T09:40:00Z',
    createdAt: '2026-05-20T08:00:00Z',
    decisions: [MOCK_DECISIONS[3]],
  },

  // job-002 — undecided
  {
    id: 'cand-005',
    jobId: 'job-002',
    source: 'linkedin',
    sourceId: 'li-p-8812345',
    name: 'Aisha Johnson',
    email: 'aisha.j.work@gmail.com',
    phone: '(510) 555-0588',
    location: 'Hayward, CA',
    distanceMi: 9,
    resumeLastActive: '5 days ago',
    rawText: 'Aisha Johnson · Hayward CA · 4 years distribution and logistics experience',
    jobsJson: [
      { role: 'Logistics Coordinator', employer: 'Sysco Foods', start: '2022-06', end: null, detail: 'Coordinated inbound/outbound freight; worked alongside forklift ops daily.' },
      { role: 'Shipping & Receiving Clerk', employer: 'Home Depot', start: '2020-01', end: '2022-05', detail: 'Checked in freight, managed dock schedules, basic pallet jack operation.' },
    ],
    skillsJson: ['Pallet jack', 'Shipping & receiving', 'Freight coordination', 'WMS', 'Excel'],
    pdfKey: null,
    matchScore: 66,
    willingScore: 74,
    aiSummary: '4-yr logistics background but no forklift cert; could be trainable, 9 mi away.',
    flagsJson: ['No forklift certification — requires training'],
    scoredAt: '2026-05-21T09:42:00Z',
    createdAt: '2026-05-20T08:05:00Z',
    decisions: [],
  },

  // job-002 — kept
  {
    id: 'cand-006',
    jobId: 'job-002',
    source: 'indeed',
    sourceId: 'ind-b20089',
    name: 'Carlos Reyes',
    email: 'c.reyes.forklift@gmail.com',
    phone: '(510) 555-0734',
    location: 'Richmond, CA',
    distanceMi: 12,
    resumeLastActive: '1 day ago',
    rawText: 'Carlos Reyes · Richmond CA · Experienced forklift operator and material handler',
    jobsJson: [
      { role: 'Forklift Operator', employer: 'Prologis Warehouse', start: '2023-01', end: null, detail: 'Operated reach and counterbalance forklifts in a high-velocity e-commerce DC.' },
      { role: 'Material Handler', employer: 'XPO Logistics', start: '2020-07', end: '2022-12', detail: 'Loading trailers, inventory putaway, cycle counting.' },
    ],
    skillsJson: ['Forklift (certified)', 'Counterbalance', 'Reach truck', 'Cold storage', 'OSHA 10', 'RF scanner'],
    pdfKey: null,
    matchScore: 88,
    willingScore: 83,
    aiSummary: 'Certified forklift op with 5+ yrs experience; recently active and within 12 miles.',
    flagsJson: [],
    scoredAt: '2026-05-21T09:50:00Z',
    createdAt: '2026-05-20T08:10:00Z',
    decisions: [MOCK_DECISIONS[4]],
  },

  // job-003 — undecided (two in queue for swiping)
  {
    id: 'cand-007',
    jobId: 'job-003',
    source: 'linkedin',
    sourceId: 'li-p-5543901',
    name: 'Priya Patel',
    email: 'priya.patel.work@gmail.com',
    phone: '(408) 555-0221',
    location: 'Milpitas, CA',
    distanceMi: 7,
    resumeLastActive: '2 days ago',
    rawText: 'Priya Patel · Milpitas CA · Entry-level seeking warehouse / fulfillment opportunity',
    jobsJson: [
      { role: 'Retail Stock Associate', employer: 'Target', start: '2023-11', end: null, detail: 'Nightly stocking, inventory scanning, heavy lifting up to 50 lbs.' },
    ],
    skillsJson: ['Inventory scanning', 'Heavy lifting', 'Team player', 'Punctual'],
    pdfKey: null,
    matchScore: 72,
    willingScore: 85,
    aiSummary: 'Entry-level with retail stock experience; strong availability and local — good attitude fit.',
    flagsJson: [],
    scoredAt: '2026-05-22T10:00:00Z',
    createdAt: '2026-05-21T15:00:00Z',
    decisions: [],
  },
  {
    id: 'cand-008',
    jobId: 'job-003',
    source: 'indeed',
    sourceId: 'ind-c30044',
    name: 'James O\'Brien',
    email: 'jobrien_wh@gmail.com',
    phone: '(408) 555-0963',
    location: 'Santa Clara, CA',
    distanceMi: 5,
    resumeLastActive: '1 week ago',
    rawText: 'James O\'Brien · Santa Clara CA · Warehouse and fulfillment experience',
    jobsJson: [
      { role: 'Fulfillment Associate', employer: 'Amazon', start: '2021-06', end: '2024-09', detail: 'Pick/pack/ship — 350+ units/hr rate, zero dock defects for 18 consecutive months.' },
      { role: 'Stock Clerk', employer: 'Safeway', start: '2019-03', end: '2021-05', detail: 'Overnight stocking, backroom organization.' },
    ],
    skillsJson: ['Pick & pack', 'RF scanner', 'Sortation', 'Heavy lifting', 'Reliability'],
    pdfKey: null,
    matchScore: 84,
    willingScore: 78,
    aiSummary: '3-yr Amazon fulfillment associate; high throughput rate, 5 mi away, left 8 months ago.',
    flagsJson: ['8-month employment gap — reason unknown'],
    scoredAt: '2026-05-22T10:05:00Z',
    createdAt: '2026-05-21T15:05:00Z',
    decisions: [],
  },
]

// ── Outreach ──────────────────────────────────────────────────────────────────

export const MOCK_OUTREACH: Outreach[] = [
  {
    id: 'out-001',
    candidateId: 'cand-001',
    jobId: 'job-001',
    channel: 'indeed_message',
    draft:
      "Hi Maria, I came across your profile and I think you'd be a great fit for an Assembly Technician role in Fremont — it's $16–18/hr and very close to where you are. Would you be open to a quick call this week?",
    sentAt: '2026-05-20T15:00:00Z',
    response: 'replied',
    credited: true,
  },
  {
    id: 'out-002',
    candidateId: 'cand-004',
    jobId: 'job-002',
    channel: 'indeed_message',
    draft:
      "Hi Tyrone, your forklift experience at the IKEA DC caught my eye. I have a Forklift Operator opening in Oakland — $18–21/hr, just 2 miles from you. Interested in hearing more?",
    sentAt: '2026-05-21T11:00:00Z',
    response: null,
    credited: true,
  },
  {
    id: 'out-003',
    candidateId: 'cand-006',
    jobId: 'job-002',
    channel: 'indeed_message',
    draft:
      "Hi Carlos, I noticed your forklift background at Prologis — I have a reach-truck role in Oakland at $18–21/hr that looks like a strong match. Would you be available for a quick call?",
    sentAt: null,
    response: null,
    credited: false,
  },
]

// ── ATS Log ───────────────────────────────────────────────────────────────────

export const MOCK_ATS_LOGS: AtsLog[] = [
  {
    id: 'ats-001',
    candidateId: 'cand-001',
    jobId: 'job-001',
    atsId: 'BH-29041',
    stage: 'submitted',
    loggedAt: '2026-05-20T15:05:00Z',
    notes: '5-yr assembly tech at Flex; strong SMT & QC background; 4 miles away and resume active 2 days ago.',
  },
  {
    id: 'ats-002',
    candidateId: 'cand-004',
    jobId: 'job-002',
    atsId: 'BH-29055',
    stage: 'submitted',
    loggedAt: '2026-05-21T11:10:00Z',
    notes: '7-yr forklift veteran, certified, 2 miles away, active resume — near-perfect fit for this role.',
  },
]

// ── Parse result (used in /parse view) ───────────────────────────────────────

export const MOCK_PARSE_RESULT: ParseResult = {
  parsed: {
    name: 'Maria Santos',
    email: 'msantos@gmail.com',
    phone: '(510) 555-0142',
    location: 'Fremont, CA',
    jobs: [
      { role: 'Assembly Technician', employer: 'Flex Ltd', start: '2022-03', end: null, detail: 'Soldered and tested PCB assemblies.' },
      { role: 'Production Operator', employer: 'Benchmark Electronics', start: '2019-06', end: '2022-02', detail: 'Ran SMT pick-and-place machines.' },
    ],
    skills: ['PCB assembly', 'SMT operations', 'Quality inspection', 'ESD handling', '5S'],
  },
  matchScore: 91,
  willingScore: 88,
  flags: [],
  reasoning: 'Exact title match, close proximity, resume active this week, pay history aligns with offered range.',
  aiSummary: '5-yr assembly tech at Flex; strong SMT & QC background; 4 miles away and resume active 2 days ago.',
}
