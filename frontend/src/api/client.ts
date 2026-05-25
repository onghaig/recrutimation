/**
 * API entry point.
 * • If VITE_API_URL is set  → talks to the real Fastify backend (realClient).
 * • If VITE_API_URL is unset → returns in-memory mock data (mockClient).
 *
 * All views import from here so the switch is transparent.
 */
import { api as realApi } from './realClient'
import { api as mockApi } from './mockClient'

export const api = import.meta.env.VITE_API_URL ? realApi : mockApi
