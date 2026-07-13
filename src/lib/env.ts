// Embedded production environment configuration.
// These values are used as FALLBACKS when env vars are not set (e.g., on Vercel
// before you configure the dashboard). This enables zero-config deployment.
//
// For production, set real env vars in Vercel → Settings → Environment Variables
// to override these defaults. Secrets like NEXTAUTH_SECRET should always be set
// via the dashboard for security.

function env(key: string, fallback?: string): string | undefined {
  const val = process.env[key];
  if (val && val.length > 0) return val;
  return fallback;
}

// ---- MongoDB Atlas (LIVE) ----
export const MONGODB_URI = env(
  "MONGODB_URI",
  "mongodb+srv://max11:NciH9bevWbkDz5IT@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat"
);

// ---- Database (SQLite fallback — not used with MongoDB) ----
export const DATABASE_URL = env("DATABASE_URL", "file:./db/custom.db");

// ---- NextAuth ----
export const NEXTAUTH_URL = env("NEXTAUTH_URL", "https://playbeat.live");
export const NEXTAUTH_SECRET = env(
  "NEXTAUTH_SECRET",
  "L8obsM1ZC6mxvHgPYcvhmBdR5F5vuQ4uUPm0fB7H3U8="
);

// ---- Admin Bootstrap ----
export const ADMIN_BOOTSTRAP_EMAIL = env(
  "ADMIN_BOOTSTRAP_EMAIL",
  "admin@playbeat.live"
);

// ---- Google OAuth ----
export const GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET");

// ---- Facebook OAuth ----
export const FACEBOOK_CLIENT_ID = env("FACEBOOK_CLIENT_ID");
export const FACEBOOK_CLIENT_SECRET = env("FACEBOOK_CLIENT_SECRET");

// ---- JazzCash (Pakistan payments — sandbox) ----
export const JAZZCASH_SANDBOX = env("JAZZCASH_SANDBOX", "true");
export const JAZZCASH_MERCHANT_ID = env("JAZZCASH_MERCHANT_ID", "MC828933");
export const JAZZCASH_PASSWORD = env("JAZZCASH_PASSWORD", "t3zz48w4aa");
export const JAZZCASH_INTEGRITY_SALT = env(
  "JAZZCASH_INTEGRITY_SALT",
  "tdw4713y34"
);
export const JAZZCASH_RETURN_URL = env(
  "JAZZCASH_RETURN_URL",
  "https://playbeat.live/api/payments/jazzcash/return"
);

// ---- EasyPaisa (manual payment) ----
export const EASYPAISA_NUMBER = env("EASYPAISA_NUMBER", "03390005715");
export const NEXT_PUBLIC_EASYPAISA_NUMBER = env(
  "NEXT_PUBLIC_EASYPAISA_NUMBER",
  "03390005715"
);

// ---- Stripe (international cards) ----
export const STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY");
export const STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY");

// ---- PayPal (international) ----
export const PAYPAL_CLIENT_ID = env("PAYPAL_CLIENT_ID");
export const PAYPAL_CLIENT_SECRET = env("PAYPAL_CLIENT_SECRET");
export const PAYPAL_SANDBOX = env("PAYPAL_SANDBOX", "true");

// ---- Bot Handler ----
export const BOT_HANDLER_SECRET = env("BOT_HANDLER_SECRET", "playbeat-bot-2026");
