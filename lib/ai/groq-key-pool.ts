import 'server-only'

/**
 * Server-only Groq key pool.
 *
 * Requests are distributed round-robin across distinct configured keys. This
 * isolates bursts without exposing credentials or retrying around a provider
 * rate-limit response. Provider/account limits and Bharatverse's own safety
 * limit still apply.
 */
let cursor = 0

export function configuredGroqKeys(): string[] {
  const candidates = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY,
  ]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key))

  return Array.from(new Set(candidates))
}

export function selectGroqApiKey(): string | null {
  const keys = configuredGroqKeys()
  if (!keys.length) return null
  const key = keys[cursor % keys.length]
  cursor = (cursor + 1) % keys.length
  return key
}
