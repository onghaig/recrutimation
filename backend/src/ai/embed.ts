import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Embed a text string using OpenAI text-embedding-3-small.
 * Returns a float array (1536 dims).
 */
export async function embed(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // stay within token limit
  })
  return response.data[0].embedding
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Compute a 0-100 match score between a job description and a resume text.
 */
export async function computeMatchScore(
  jobDescription: string,
  resumeText: string
): Promise<number> {
  const [jobEmbedding, candidateEmbedding] = await Promise.all([
    embed(jobDescription),
    embed(resumeText),
  ])
  const similarity = cosineSimilarity(jobEmbedding, candidateEmbedding)
  // cosine similarity is -1 to 1; scale to 0-100
  return Math.round(((similarity + 1) / 2) * 100)
}
