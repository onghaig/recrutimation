/**
 * Authenticated POST to the Recrutimation backend.
 * The API URL is stored in chrome.storage.sync so the recruiter
 * can point it at local dev or production.
 */

export async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      resolve(result.apiUrl ?? 'http://localhost:3000')
    })
  })
}

/**
 * POST /api/ingest with the given payload.
 * @param {object} payload - { source, platform_job_id?, candidates[] }
 * @returns {Promise<object>} response JSON
 */
export async function ingest(payload) {
  const base = await getApiUrl()
  const res = await fetch(`${base}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
