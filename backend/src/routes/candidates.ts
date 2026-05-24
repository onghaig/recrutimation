import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { scoreQueue } from '../workers/scorer.js'
import { presignUrl, uploadPdf } from '../storage/r2.js'
import { computeMatchScore } from '../ai/embed.js'
import { scoreWillingness, generateSummary, parseCandidate } from '../ai/score.js'

const DecisionSchema = z.object({
  decision: z.enum(['keep', 'pin', 'skip']),
  jobId: z.string().uuid(),
  pinNote: z.string().optional(),
  pinRemind: z.string().optional(), // ISO date string
})

const ParseAndScoreSchema = z.object({
  rawText: z.string().min(1),
  jobDescription: z.string().min(1),
  jobTitle: z.string(),
  jobLocation: z.string().optional(),
  jobPayRange: z.string().optional(),
  jobId: z.string().uuid().optional(),
})

export async function candidateRoutes(fastify: FastifyInstance) {
  // POST /api/parse — Phase 1 MVP: paste raw text, get structured candidate + scores
  fastify.post('/api/parse', async (req, reply) => {
    const body = ParseAndScoreSchema.parse(req.body)

    // Parse candidate structure
    const parsed = await parseCandidate(body.rawText)

    // Compute match score
    const matchScore = await computeMatchScore(body.jobDescription, body.rawText)

    // Willingness score
    const firstJob = parsed.jobs[0]
    const willingnessResult = await scoreWillingness({
      jobTitle: body.jobTitle,
      jobPayRange: body.jobPayRange,
      jobLocation: body.jobLocation,
      mostRecentRole: firstJob?.role,
      employer: firstJob?.employer,
      jobsJson: parsed.jobs,
    })

    // Summary
    const aiSummary = await generateSummary(body.rawText, body.jobTitle)

    // Optionally persist
    let candidateId: string | undefined
    if (body.jobId) {
      const candidate = await prisma.candidate.create({
        data: {
          jobId: body.jobId,
          source: 'paste',
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          location: parsed.location,
          rawText: body.rawText,
          jobsJson: parsed.jobs,
          skillsJson: parsed.skills,
          matchScore,
          willingScore: willingnessResult.willing_score,
          aiSummary,
          flagsJson: willingnessResult.flags,
          scoredAt: new Date(),
        },
      })
      candidateId = candidate.id
    }

    return {
      candidateId,
      parsed,
      matchScore,
      willingScore: willingnessResult.willing_score,
      flags: willingnessResult.flags,
      reasoning: willingnessResult.reasoning,
      aiSummary,
    }
  })

  // GET /api/candidates/:id — get single candidate
  fastify.get<{ Params: { id: string } }>('/api/candidates/:id', async (req, reply) => {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
        outreach: { orderBy: { sentAt: 'desc' } },
      },
    })
    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })
    return candidate
  })

  // POST /api/candidates/:id/score — (re)score a candidate
  fastify.post<{ Params: { id: string } }>('/api/candidates/:id/score', async (req, reply) => {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } })
    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })
    if (!candidate.jobId) return reply.status(400).send({ error: 'Candidate has no associated job' })

    await scoreQueue.add('score', { candidateId: candidate.id, jobId: candidate.jobId })
    return { queued: true }
  })

  // GET /api/candidates/:id/pdf — get presigned R2 URL for PDF
  fastify.get<{ Params: { id: string } }>('/api/candidates/:id/pdf', async (req, reply) => {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } })
    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })
    if (!candidate.pdfKey) return reply.status(404).send({ error: 'No PDF on file' })

    const url = await presignUrl(candidate.pdfKey)
    return { url, expiresIn: 3600 }
  })

  // POST /api/candidates/:id/pdf — upload a PDF resume
  fastify.post<{ Params: { id: string } }>(
    '/api/candidates/:id/pdf',
    async (req, reply) => {
      const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } })
      if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })

      const data = await req.file()
      if (!data) return reply.status(400).send({ error: 'No file uploaded' })

      const buffer = await data.toBuffer()
      const pdfKey = await uploadPdf(candidate.id, buffer, data.mimetype)

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { pdfKey },
      })

      return { pdfKey }
    }
  )

  // POST /api/candidates/:id/decision — save keep/pin/skip
  fastify.post<{ Params: { id: string } }>('/api/candidates/:id/decision', async (req, reply) => {
    const body = DecisionSchema.parse(req.body)
    const { id } = req.params

    const candidate = await prisma.candidate.findUnique({ where: { id } })
    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })

    const decision = await prisma.decision.create({
      data: {
        candidateId: id,
        jobId: body.jobId,
        decision: body.decision,
        pinNote: body.pinNote,
        pinRemind: body.pinRemind ? new Date(body.pinRemind) : undefined,
      },
    })

    return reply.status(201).send(decision)
  })
}
