import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'

const LogSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  atsId: z.string().optional(),
  stage: z.enum(['submitted', 'interviewing', 'hired', 'pcf_created', 'pinned']),
  notes: z.string().optional(),
})

const PcfSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  hireDate: z.string(), // ISO date
  clientName: z.string(),
})

export async function atsRoutes(fastify: FastifyInstance) {
  // POST /api/ats/log — create an ATS entry
  fastify.post('/api/ats/log', async (req, reply) => {
    const body = LogSchema.parse(req.body)

    const entry = await prisma.atsLog.create({
      data: {
        candidateId: body.candidateId,
        jobId: body.jobId,
        atsId: body.atsId,
        stage: body.stage,
        notes: body.notes,
      },
    })

    return reply.status(201).send(entry)
  })

  // POST /api/ats/pcf — create PCF record on hire
  fastify.post('/api/ats/pcf', async (req, reply) => {
    const body = PcfSchema.parse(req.body)

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: body.candidateId } }),
      prisma.job.findUnique({ where: { id: body.jobId } }),
    ])

    if (!candidate) return reply.status(404).send({ error: 'Candidate not found' })
    if (!job) return reply.status(404).send({ error: 'Job not found' })

    const pcfNotes = [
      `PCF — ${body.clientName}`,
      `Candidate: ${candidate.name}`,
      `Role: ${job.title}`,
      `Location: ${job.location ?? 'TBD'}`,
      `Hire date: ${body.hireDate}`,
      `AI summary: ${candidate.aiSummary ?? 'N/A'}`,
    ].join('\n')

    const entry = await prisma.atsLog.create({
      data: {
        candidateId: body.candidateId,
        jobId: body.jobId,
        stage: 'pcf_created',
        notes: pcfNotes,
      },
    })

    return reply.status(201).send({ ...entry, pcfNotes })
  })

  // GET /api/ats/:candidateId — ATS history for a candidate
  fastify.get<{ Params: { candidateId: string } }>(
    '/api/ats/:candidateId',
    async (req) => {
      return prisma.atsLog.findMany({
        where: { candidateId: req.params.candidateId },
        orderBy: { loggedAt: 'desc' },
      })
    }
  )

  // GET /api/ats/export/csv — export all ATS logs as CSV
  fastify.get('/api/ats/export/csv', async (_req, reply) => {
    const logs = await prisma.atsLog.findMany({
      include: {
        candidate: { select: { name: true, email: true, phone: true } },
        job: { select: { title: true, location: true } },
      },
      orderBy: { loggedAt: 'desc' },
    })

    const rows = [
      'candidate_id,candidate_name,email,phone,job_title,job_location,stage,ats_id,logged_at,notes',
      ...logs.map((l) =>
        [
          l.candidateId,
          `"${l.candidate.name ?? ''}"`,
          l.candidate.email ?? '',
          l.candidate.phone ?? '',
          `"${l.job.title}"`,
          `"${l.job.location ?? ''}"`,
          l.stage,
          l.atsId ?? '',
          l.loggedAt.toISOString(),
          `"${(l.notes ?? '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n')

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="ats_export.csv"')
      .send(rows)
  })
}
