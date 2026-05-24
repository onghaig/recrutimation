import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { generateOutreachDraft } from '../ai/draft.js'

const DraftSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  channel: z.enum(['indeed_message', 'linkedin_message', 'sms', 'call']).optional(),
})

const SendSchema = z.object({
  outreachId: z.string().uuid(),
})

export async function outreachRoutes(fastify: FastifyInstance) {
  // POST /api/outreach/draft — generate a draft outreach message
  fastify.post('/api/outreach/draft', async (req, reply) => {
    const body = DraftSchema.parse(req.body)

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: body.candidateId } }),
      prisma.job.findUnique({ where: { id: body.jobId } }),
    ])

    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })
    if (!job) return reply.status(404).send({ error: 'Job not found' })

    const firstName = candidate.name?.split(' ')[0] ?? null
    const jobsArray = Array.isArray(candidate.jobsJson) ? candidate.jobsJson : []
    const firstJob = jobsArray[0] as
      | { role?: string; employer?: string }
      | undefined

    const draft = await generateOutreachDraft({
      jobTitle: job.title,
      jobLocation: job.location,
      jobPayRange: job.payRange,
      candidateFirstName: firstName,
      mostRecentRole: firstJob?.role,
      employer: firstJob?.employer,
      aiSummary: candidate.aiSummary,
    })

    // Save draft to DB
    const outreach = await prisma.outreach.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        channel: body.channel ?? 'indeed_message',
        draft,
      },
    })

    return reply.status(201).send(outreach)
  })

  // POST /api/outreach/send — mark outreach as sent
  fastify.post('/api/outreach/send', async (req, reply) => {
    const body = SendSchema.parse(req.body)

    const outreach = await prisma.outreach.update({
      where: { id: body.outreachId },
      data: {
        sentAt: new Date(),
        credited: true,
      },
    })

    return outreach
  })

  // PATCH /api/outreach/:id — update draft text before sending
  fastify.patch<{ Params: { id: string } }>('/api/outreach/:id', async (req, reply) => {
    const { id } = req.params
    const body = z.object({ draft: z.string() }).parse(req.body)

    const outreach = await prisma.outreach.update({
      where: { id },
      data: { draft: body.draft },
    })

    return outreach
  })

  // GET /api/outreach/:candidateId — outreach history for a candidate
  fastify.get<{ Params: { candidateId: string } }>(
    '/api/outreach/:candidateId',
    async (req) => {
      return prisma.outreach.findMany({
        where: { candidateId: req.params.candidateId },
        orderBy: { sentAt: 'desc' },
      })
    }
  )
}
