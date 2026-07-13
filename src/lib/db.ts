import { PrismaClient } from '@prisma/client'

// ALWAYS set the correct MongoDB URI — Vercel dashboard may have a wrong value.
// This guarantees the database connection works on all deployments.
const CORRECT_MONGODB_URI =
  "mongodb+srv://max11:NciH9bevWbkDz5IT@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat"

// Only use the dashboard value if it contains the correct cluster hostname.
if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.includes("playbeat.umqpdyx")) {
  process.env.MONGODB_URI = CORRECT_MONGODB_URI
}

// Also set other required env vars if missing (Vercel dashboard takes priority).
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "L8obsM1ZC6mxvHgPYcvhmBdR5F5vuQ4uUPm0fB7H3U8="
}
if (!process.env.NEXTAUTH_URL) {
  // Auto-detect from Vercel environment
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://playbeattv.buzz";
}
if (!process.env.ADMIN_BOOTSTRAP_EMAIL) {
  process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@playbeat.live"
}
if (!process.env.ADMIN_LOGIN_PASSWORD) {
  process.env.ADMIN_LOGIN_PASSWORD = "playbeat123"
}
if (!process.env.JAZZCASH_MERCHANT_ID) {
  process.env.JAZZCASH_MERCHANT_ID = "MC828933"
  process.env.JAZZCASH_PASSWORD = "t3zz48w4aa"
  process.env.JAZZCASH_INTEGRITY_SALT = "tdw4713y34"
  process.env.JAZZCASH_SANDBOX = "true"
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://playbeattv.buzz"
  process.env.JAZZCASH_RETURN_URL = `${baseUrl}/api/payments/jazzcash/return`
}
if (!process.env.EASYPAISA_NUMBER) {
  process.env.EASYPAISA_NUMBER = "03390005715"
  process.env.NEXT_PUBLIC_EASYPAISA_NUMBER = "03390005715"
}
if (!process.env.BOT_HANDLER_SECRET) {
  process.env.BOT_HANDLER_SECRET = "playbeat-bot-2026"
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling and retry-friendly settings.
function createPrismaClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.MONGODB_URI,
      },
    },
  })
}

// Initialize with retry logic for cold starts on Vercel.
let client: PrismaClient
if (globalForPrisma.prisma) {
  client = globalForPrisma.prisma
} else {
  client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
}

export const db = client

/**
 * Execute a database operation with automatic retry on connection errors.
 * Vercel serverless functions can have cold-start connection issues — this
 * retries up to 3 times with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      // Retry on connection errors (DNS, timeout, connection reset).
      const isConnectionError =
        msg.includes("DNS") ||
        msg.includes("connection") ||
        msg.includes("timeout") ||
        msg.includes("ConnectorError") ||
        msg.includes("Timed out") ||
        msg.includes("ECONNRESET") ||
        msg.includes("socket")
      if (!isConnectionError || attempt === retries - 1) {
        throw err
      }
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
  }
  throw lastError
}
