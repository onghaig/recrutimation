import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface WillingnessResult {
  willing_score: number
  flags: string[]
  reasoning: string
}

export interface ScoreInput {
  jobTitle: string
  jobPayRange?: string | null
  jobLocation?: string | null
  mostRecentRole?: string
  employer?: string
  duration?: string
  jobsJson?: unknown
  distanceMi?: number | null
  resumeLastActive?: string | null
  rawText?: string | null
}

/**
 * Ask Claude to estimate willingness score (0-100) and surface flags.
 */
export async function scoreWillingness(input: ScoreInput): Promise<WillingnessResult> {
  const prompt = `You are assessing whether a job candidate is likely to accept and stay in a role.

Job: ${input.jobTitle}${input.jobPayRange ? `, ${input.jobPayRange}` : ''}${input.jobLocation ? `, ${input.jobLocation}` : ''}
Candidate's most recent role: ${input.mostRecentRole ?? 'Unknown'} at ${input.employer ?? 'Unknown'}${input.duration ? `, ${input.duration}` : ''}
Candidate's full job history: ${JSON.stringify(input.jobsJson ?? [])}
Distance from job: ${input.distanceMi != null ? `${input.distanceMi} miles` : 'Unknown'}
Resume last active: ${input.resumeLastActive ?? 'Unknown'}

Score from 0–100 how likely this candidate is to:
1. Respond to outreach
2. Accept the role if offered
3. Stay past 30 days

Return JSON only — no prose before or after:
{ "willing_score": number, "flags": string[], "reasoning": string }

Penalise heavily for: overqualification, large pay gap upward, long commute for low-wage role,
resume inactive > 3 months, very recent job start (they just started somewhere else).
Reward: exact title match, local, recently active, similar pay history, gaps in employment.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip any markdown fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as WillingnessResult
}

/**
 * Generate a one-line recruiter-facing summary for a candidate.
 */
export async function generateSummary(rawText: string, jobTitle: string): Promise<string> {
  const prompt = `Summarise this candidate in one sentence for a recruiter reviewing candidates for a "${jobTitle}" role.
Be specific: mention years of experience, most relevant role, and any key risk factors.
Do not use filler phrases like "dynamic professional" or "results-driven". Max 25 words.

Candidate profile:
${rawText.slice(0, 3000)}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

/**
 * Parse raw candidate paste text into a structured object.
 */
export async function parseCandidate(rawText: string): Promise<{
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  jobs: Array<{ role: string; employer: string; start?: string; end?: string; detail?: string }>
  skills: string[]
}> {
  const prompt = `Extract structured data from this candidate profile text.
Return JSON only — no prose:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "jobs": [{ "role": string, "employer": string, "start": string | null, "end": string | null, "detail": string | null }],
  "skills": string[]
}

Profile text:
${rawText.slice(0, 8000)}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
