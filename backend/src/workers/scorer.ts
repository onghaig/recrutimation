/**
 * BullMQ scorer worker — picks up scoring jobs and runs the AI pipeline.
 *
 * Run with: npm run worker
 * (or alongside the API server in development)
 */
import { Worker, Queue } from 'bullmq'
import { Redis as IORedis } from 'ioredis'
import { prisma } from '../db/client.js'
import { computeMatchScore } from '../ai/embed.js'
import { scoreWillingness, generateSummary } from '../ai/score.js'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

export const SCORE_QUEUE = 'score'

export const scoreQueue = new Queue(SCORE_QUEUE, { connection })

export interface ScoreJobData {
  candidateId: string
  jobId: string
}

const worker = new Worker<ScoreJobData>(
  SCORE_QUEUE,
  async (job) => {
    const { candidateId, jobId } = job.data
    console.log(`[scorer] Processing candidate ${candidateId} for job ${jobId}`)

    const [candidate, jobRecord] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ])

    if (!candidate || !jobRecord) {
      throw new Error(`Candidate or job not found: ${candidateId}, ${jobId}`)
    }

    if (!candidate.rawText || !jobRecord.description) {
      console.warn(`[scorer] Missing rawText or job description for ${candidateId}`)
      return
    }

    // Step 1 — compute match score via embeddings
    const matchScore = await computeMatchScore(jobRecord.description, candidate.rawText)

    // Step 2 — willingness score via Claude
    const jobsArray = Array.isArray(candidate.jobsJson) ? candidate.jobsJson : []
    const firstJob = jobsArray[0] as
      | { role?: string; employer?: string; start?: string; end?: string }
      | undefined

    const willingnessResult = await scoreWillingness({
      jobTitle: jobRecord.title,
      jobPayRange: jobRecord.payRange,
      jobLocation: jobRecord.location,
      mostRecentRole: firstJob?.role,
      employer: firstJob?.employer,
      duration:
        firstJob?.start && firstJob?.end ? `${firstJob.start} – ${firstJob.end}` : undefined,
      jobsJson: candidate.jobsJson,
      distanceMi: candidate.distanceMi ? Number(candidate.distanceMi) : null,
      resumeLastActive: candidate.resumeLastActive?.toISOString().split('T')[0] ?? null,
    })

    // Step 3 — one-line summary via Claude
    const aiSummary = await generateSummary(candidate.rawText, jobRecord.title)

    // Step 4 — write back to DB
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        matchScore,
        willingScore: willingnessResult.willing_score,
        aiSummary,
        flagsJson: willingnessResult.flags,
        scoredAt: new Date(),
      },
    })

    console.log(
      `[scorer] Done — candidate ${candidateId}: match=${matchScore} willing=${willingnessResult.willing_score}`
    )
  },
  {
    connection,
    concurrency: 3,
  }
)

worker.on('failed', (job, err) => {
  console.error(`[scorer] Job ${job?.id} failed:`, err.message)
})

worker.on('completed', (job) => {
  console.log(`[scorer] Job ${job.id} completed`)
})

console.log('[scorer] Worker started, waiting for jobs…')
