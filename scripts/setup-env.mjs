// Pre-build env setup for Vercel.
// Writes embedded production env values to .env if they're not already set.
// This enables zero-config deployment — Vercel builds work even before you
// add env vars in the dashboard.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envValues = {
  MONGODB_URI:
    "mongodb+srv://max11:NciH9bevWbkDz5IT@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat",
  DATABASE_URL: "file:./db/custom.db",
  NEXTAUTH_URL: "https://playbeat.live",
  NEXTAUTH_SECRET: "L8obsM1ZC6mxvHgPYcvhmBdR5F5vuQ4uUPm0fB7H3U8=",
  ADMIN_BOOTSTRAP_EMAIL: "admin@playbeat.live",
  JAZZCASH_SANDBOX: "true",
  JAZZCASH_MERCHANT_ID: "MC828933",
  JAZZCASH_PASSWORD: "t3zz48w4aa",
  JAZZCASH_INTEGRITY_SALT: "tdw4713y34",
  JAZZCASH_RETURN_URL:
    "https://playbeat.live/api/payments/jazzcash/return",
  EASYPAISA_NUMBER: "03390005715",
  NEXT_PUBLIC_EASYPAISA_NUMBER: "03390005715",
  PAYPAL_SANDBOX: "true",
  BOT_HANDLER_SECRET: "playbeat-bot-2026",
};

const envPath = path.join(__dirname, "..", ".env");
let existing = "";
try {
  existing = fs.readFileSync(envPath, "utf8");
} catch {
  // no existing .env
}

const lines = [];
for (const [key, value] of Object.entries(envValues)) {
  const inProcess = process.env[key];
  const inFile = new RegExp(`^${key}=`, "m").test(existing);
  if (inProcess) {
    lines.push(`${key}=${inProcess}`);
  } else if (!inFile) {
    lines.push(`${key}=${value}`);
  }
}

if (lines.length > 0) {
  const content = lines.join("\n") + "\n";
  fs.appendFileSync(envPath, content);
  console.log(`✓ Wrote ${lines.length} env vars to .env`);
} else {
  console.log("✓ All env vars already configured");
}
