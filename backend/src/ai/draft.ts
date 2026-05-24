import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface DraftInput {
  jobTitle: string
  jobLocation?: string | null
  jobPayRange?: string | null
  candidateFirstName?: string | null
  mostRecentRole?: string | null
  employer?: string | null
  aiSummary?: string | null
}

/**
 * Generate a short, natural outreach message for a candidate.
 */
export async function generateOutreachDraft(input: DraftInput): Promise<string> {
  const prompt = `Write a brief recruiting outreach message.
Keep it under 4 sentences. Friendly, not salesy.
Do not mention the company name. Do not use templates or filler phrases.
Address the candidate by first name.

Job: ${input.jobTitle}${input.jobLocation ? ` in ${input.jobLocation}` : ''}${input.jobPayRange ? `, ${input.jobPayRange}` : ''}
Candidate's name: ${input.candidateFirstName ?? 'there'}
Most relevant experience: ${input.mostRecentRole ?? 'their background'}${input.employer ? ` at ${input.employer}` : ''}
Why they're a fit: ${input.aiSummary ?? 'their experience aligns with the role requirements'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
