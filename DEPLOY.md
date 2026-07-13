# Deploying PlayBeat TV to Vercel

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. Your GitHub repo: `uzzirulzz-cyber/playbeattv`
3. MongoDB Atlas with `0.0.0.0/0` IP allowlist (Vercel uses dynamic IPs)

---

## Step 1: Allow Vercel IPs in MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access From Anywhere** (`0.0.0.0/0`)
4. Click **Confirm**

> This is required because Vercel's serverless functions use dynamic IPs.

---

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo: `uzzirulzz-cyber/playbeattv`
3. Vercel auto-detects Next.js — keep default settings
4. **Don't deploy yet** — add environment variables first

---

## Step 3: Add Environment Variables

Download the env file from `/vercel-env.txt` (in the preview panel), then add each variable in:
**Vercel → Project → Settings → Environment Variables**

Or use the CLI:
```bash
npm i -g vercel
vercel link
vercel env import .env production
```

### Required Variables (copy these exactly)

```
MONGODB_URI=mongodb+srv://max11:NciH9bevWbkDz5IT@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=L8obsM1ZC6mxvHgPYcvhmBdR5F5vuQ4uUPm0fB7H3U8=
ADMIN_BOOTSTRAP_EMAIL=admin@playbeat.live
JAZZCASH_SANDBOX=true
JAZZCASH_MERCHANT_ID=MC828933
JAZZCASH_PASSWORD=t3zz48w4aa
JAZZCASH_INTEGRITY_SALT=tdw4713y34
JAZZCASH_RETURN_URL=https://your-domain.vercel.app/api/payments/jazzcash/return
EASYPAISA_NUMBER=03390005715
NEXT_PUBLIC_EASYPAISA_NUMBER=03390005715
BOT_HANDLER_SECRET=playbeat-bot-2026
```

> **Important:** Replace `your-domain.vercel.app` with your actual Vercel domain.
> Set environment to **Production** (and Preview if you want).

---

## Step 4: Deploy

Click **Deploy** in Vercel. The build will:
1. `bun install` — install dependencies
2. `bun run db:generate` — generate Prisma client
3. `next build` — build the Next.js app

---

## Step 5: First Deploy Setup

After your first deploy:

1. **Visit your Vercel URL** — you'll see the PlayBeat TV landing page
2. **Sign up** with `admin@playbeat.live` — this creates your admin account
3. **Go to Admin Panel** → Streaming Backend → verify the playlist is seeded
4. **Update OAuth redirect URLs** to your Vercel domain:
   - Google: `https://your-domain.vercel.app/api/auth/callback/google`
   - Facebook: `https://your-domain.vercel.app/api/auth/callback/facebook`
5. **Update JazzCash return URL** in `.env`:
   - `JAZZCASH_RETURN_URL=https://your-domain.vercel.app/api/payments/jazzcash/return`

---

## Custom Domain (playbeat.live)

1. Vercel → Project → **Settings → Domains**
2. Add `playbeat.live`
3. Add `www.playbeat.live`
4. Update your DNS:
   - Add `A` record: `@ → 76.76.21.21`
   - Add `CNAME` record: `www → cname.vercel-dns.com`
5. Update env vars:
   - `NEXTAUTH_URL=https://playbeat.live`
   - `JAZZCASH_RETURN_URL=https://playbeat.live/api/payments/jazzcash/return`

---

## Cron Job (Bot Handler)

The `vercel.json` includes a cron that pings `/api/bot` every minute (Vercel's minimum interval):
```json
{
  "crons": [{ "path": "/api/bot?secret=playbeat-bot-2026", "schedule": "*/1 * * * *" }]
}
```

This handles:
- ✅ Backend health checks
- ✅ Subscription expiry
- ✅ User plan downgrades
- ✅ Stale payment cleanup

The client-side `BotHeartbeat` component also pings every 30s while users are online.

> **Note:** Vercel's free tier includes cron jobs but with a 1-minute minimum interval. For true 30s intervals, use an external service like [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com).

---

## Troubleshooting

### Build fails with Prisma error
- Ensure `DATABASE_URL` is set (even though MongoDB is used — Prisma needs it as fallback)
- The `vercel.json` build command runs `bun run db:generate` before `next build`

### MongoDB connection error
- Verify `0.0.0.0/0` is in Atlas Network Access
- Check `MONGODB_URI` is set in Vercel env vars

### Streaming doesn't work
- Vercel serverless functions have a 10s timeout on free tier (60s on Pro)
- Large video files may timeout — consider Vercel Pro or a CDN
- The stream proxy is in `src/app/api/stream/route.ts` with `maxDuration = 60`

### Auth redirects fail
- Ensure `NEXTAUTH_URL` matches your Vercel domain exactly
- Update Google/Facebook OAuth redirect URIs to the Vercel domain

---

## Environment Variables Checklist

- [ ] `MONGODB_URI` — MongoDB connection string
- [ ] `NEXTAUTH_URL` — Your Vercel domain
- [ ] `NEXTAUTH_SECRET` — JWT secret
- [ ] `ADMIN_BOOTSTRAP_EMAIL` — Admin email
- [ ] `JAZZCASH_*` — Payment creds
- [ ] `EASYPAISA_NUMBER` — EasyPaisa number
- [ ] `BOT_HANDLER_SECRET` — Bot auth secret
- [ ] `GOOGLE_CLIENT_ID/SECRET` — (optional)
- [ ] `FACEBOOK_CLIENT_ID/SECRET` — (optional)
- [ ] `STRIPE_SECRET_KEY` — (optional)
- [ ] `PAYPAL_CLIENT_ID/SECRET` — (optional)
- [ ] Atlas IP allowlist: `0.0.0.0/0`
