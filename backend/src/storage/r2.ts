import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'recruiting-pdfs'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

/**
 * Upload a PDF buffer to R2.
 * Returns the object key (e.g., "resumes/<candidateId>.pdf").
 */
export async function uploadPdf(
  candidateId: string,
  buffer: Buffer,
  contentType = 'application/pdf'
): Promise<string> {
  const key = `resumes/${candidateId}.pdf`
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )
  return key
}

/**
 * Generate a presigned URL valid for 1 hour.
 */
export async function presignUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * Delete an object from R2.
 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
}
