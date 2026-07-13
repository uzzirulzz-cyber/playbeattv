import { PrismaClient } from '@prisma/client'

// Ensure MONGODB_URI is set at runtime (Vercel serverless functions don't
// read .env files at runtime — only env vars from the dashboard).
// This embedded fallback enables zero-config deployment.
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI =
    "mongodb+srv://max11:NciH9bevWbkDz5IT@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat"
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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
