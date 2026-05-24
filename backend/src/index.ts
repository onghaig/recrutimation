import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { jobRoutes } from './routes/jobs.js'
import { candidateRoutes } from './routes/candidates.js'
import { ingestRoutes } from './routes/ingest.js'
import { outreachRoutes } from './routes/outreach.js'
import { atsRoutes } from './routes/ats.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

// Plugins
await fastify.register(cors, {
  origin: true, // Allow all origins in dev; restrict in prod
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
})

await fastify.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

// Routes
await fastify.register(jobRoutes)
await fastify.register(candidateRoutes)
await fastify.register(ingestRoutes)
await fastify.register(outreachRoutes)
await fastify.register(atsRoutes)

// Health check
fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// Global error handler
fastify.setErrorHandler((error, req, reply) => {
  fastify.log.error(error)
  if (error.name === 'ZodError') {
    return reply.status(400).send({ error: 'Validation error', details: error.message })
  }
  return reply.status(error.statusCode ?? 500).send({ error: error.message })
})

try {
  await fastify.listen({ port: PORT, host: HOST })
  console.log(`🚀 API running at http://localhost:${PORT}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
