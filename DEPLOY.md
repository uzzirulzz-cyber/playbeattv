# Deployment Guide

This guide walks you through deploying PlayBeat TV to production on Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier works)
- A [GitHub account](https://github.com/signup)
- A hosted Postgres database (Vercel Postgres, Neon, Supabase — all have free tiers)
- (Optional) A [Google Cloud project](https://console.cloud.google.com/) with YouTube Data API v3 enabled
- (Optional) An [Xtream Masters reseller account](https://xtream-masters.com/) — only if you want reseller CRUD features
- (Optional) A registered domain (e.g. `playbeattv.buzz`) — Vercel provides a free `*.vercel.app` subdomain if you don't have one

---

## Step 1 — Push to GitHub

### Option A: Use the GitHub CLI (recommended)

```bash
# Install GitHub CLI: https://cli.github.com/
# On macOS:  brew install gh
# On Linux:  see https://github.com/cli/cli/blob/trunk/docs/install_linux.md
# On Windows: winget install GitHub.cli

gh auth login                       # follow the prompts
cd /path/to/playbeattv
gh repo create playbeattv --public --source=. --remote=origin --push
```

### Option B: Manual via the GitHub web UI

1. Go to https://github.com/new
2. Repository name: `playbeattv` (or whatever you want)
3. Set to **Public** or **Private** (your choice)
4. **Do not** initialize with README / .gitignore / license (we already have them)
5. Click **Create repository**
6. Back on your machine:
   ```bash
   cd /path/to/playbeattv
   git remote add origin git@github.com:YOUR_USERNAME/playbeattv.git
   git push -u origin main
   ```

---

## Step 2 — Provision a Database

The dev sandbox uses SQLite (a local file). Vercel's serverless functions don't have persistent local disk, so you need a hosted database. The Prisma schema is database-agnostic — only one line changes.

### Recommended: Vercel Postgres (Neon)

1. In your Vercel dashboard, go to **Storage → Create Database → Postgres (Neon)**
2. Accept the free tier limits (256 MB storage, 60 compute hours/month — plenty for PlayBeat TV)
3. Once created, copy the `DATABASE_URL` from the **.env.local** tab

### Alternative: Neon directly

1. Sign up at https://neon.tech
2. Create a new project, copy the connection string

### Alternative: Supabase

1. Sign up at https://supabase.com
2. Create a new project, copy the Postgres connection string from **Settings → Database**

---

## Step 3 — Deploy to Vercel

### Option A: Via Vercel Dashboard (recommended for first deploy)

1. Go to https://vercel.com/new
2. Import your GitHub repository (`YOUR_USERNAME/playbeattv`)
3. Framework preset: **Next.js** (auto-detected)
4. **Build & Development Settings**:
   - Install command: `bun install` (or `npm install`)
   - Build command: leave default (`next build`)
   - Output directory: leave default (`.next`)
5. **Environment Variables** — add ALL of these (see [Environment Variables](#environment-variables) below)
6. Click **Deploy**
7. Wait ~3-5 minutes for the build to complete

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login                      # follow the prompts
cd /path/to/playbeattv
vercel link                       # link this folder to a Vercel project

# Set environment variables (run once per variable — see full list below)
vercel env add DATABASE_URL
vercel env add ADMIN_TOKEN
vercel env add NEXTAUTH_SECRET
# ... etc

# Deploy to production
vercel --prod
```

---

## Step 4 — Push the Database Schema

Once your Vercel deployment is live and `DATABASE_URL` is set, you need to push the Prisma schema to your hosted Postgres.

### From your local machine

```bash
# Set DATABASE_URL to your hosted Postgres connection string
export DATABASE_URL="postgresql://..."

# Push the schema (creates all 16 tables)
bun run db:push

# Seed the database (source queries + homepage rows + real Wikimedia import)
bun run scripts/seed.ts

# (Optional) Seed your real IPTV subscription
bun run scripts/seed-iptv-line.ts
```

### If you don't have Bun locally

```bash
npx prisma db push --accept-data-loss
npx tsx scripts/seed.ts
npx tsx scripts/seed-iptv-line.ts
```

---

## Step 5 — Set up Custom Domain (optional)

1. In your Vercel project dashboard, go to **Settings → Domains**
2. Add `playbeattv.buzz`
3. Vercel will show you the DNS records to add at your domain registrar:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME record**: `www` → `cname.vercel-dns.com`
4. Once DNS propagates (5-30 min), Vercel auto-provisions an SSL certificate
5. Your site is live at `https://playbeattv.buzz`

---

## Environment Variables

All variables are read server-side only (never exposed to the browser).

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string from your hosted DB | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/playbeattv?sslmode=require` |
| `ADMIN_TOKEN` | Secret string that protects admin endpoints (any value works, but make it long and random) | `pb-admin-7f3e9b2a8c4d1e6f5a9b3c2d8e7f1a4b` |
| `NEXTAUTH_SECRET` | Random 32+ char string used for cookie signing | generate with `openssl rand -base64 32` |

### Optional — Free Content Auto-Import

| Variable | Description |
|----------|-------------|
| `YOUTUBE_API_KEY` | Google Cloud API key with YouTube Data API v3 enabled. Without this, only Wikimedia Commons imports work. |

### Optional — Premium IPTV (reseller-managed lines only)

| Variable | Description |
|----------|-------------|
| `XTREAM_API_KEY` | Your Xtream Masters reseller API key. Without this, IPTV runs in demo mode. |
| `XTREAM_SERVER_URL` | Default panel URL for reseller-provisioned lines (e.g. `http://your-reseller-panel.tld:8080`). Per-line serverUrl overrides this. |

### Optional — Content Health Check

No env var needed — health check runs server-side and just pings upstream URLs.

### How to generate secrets

```bash
# ADMIN_TOKEN
openssl rand -hex 24
# → e.g. 7f3e9b2a8c4d1e6f5a9b3c2d8e7f1a4b6c5d7e8f9a0b1c2d

# NEXTAUTH_SECRET
openssl rand -base64 32
# → e.g. 7f3e9b2a8c4d1e6f5a9b3c2d8e7f1a4b6c5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f
```

---

## Post-Deployment Verification

Once deployed, visit `https://your-app.vercel.app/` and:

1. **Homepage renders** — hero banner + content rails with movie posters
2. **Click any movie** — video plays (Wikimedia .webm files play natively; YouTube plays via iframe)
3. **Click Live TV** in the nav — channel grid loads with ~851 channels
4. **Click any channel** — video plays (after a ~5-second loading spinner while hls.js fetches the m3u8 + first segment via proxy)
5. **Click Admin** in the nav — log in with your `ADMIN_TOKEN`
6. **Admin → Dashboard** — stats cards show real numbers
7. **Admin → IPTV → Overview** — credit balance + trial usage (or demo mode banner if no reseller key set)
8. **Admin → IPTV → Xtream Lines** — your `9ca33be7` line is visible with ACTIVE status

If anything fails, check Vercel's function logs (Dashboard → your project → Logs).

---

## Common Issues

### "Videos don't play"
- Check that `DATABASE_URL` is set in Vercel env vars
- Check the Vercel function logs for errors
- For IPTV specifically: the `/api/iptv/proxy` route handles mixed-content + CORS — make sure it's deployed (it should be, it's just a normal API route)
- Some Xtream segments return 403 due to short-lived tokens — hls.js auto-retries with fresh tokens, but if it's consistently failing, the upstream panel might be down

### "Admin endpoints return 401"
- `ADMIN_TOKEN` is not set in env vars, OR
- You're not sending the `Authorization: Bearer <token>` header (or `X-Admin-Token` header, or `pb_admin` cookie)

### "Database connection failed"
- Make sure `DATABASE_URL` includes `?sslmode=require` (or `?ssl=true` for some providers)
- Make sure your database provider's IP allowlist includes Vercel's IPs (most allow all by default)

### "Build failed on Vercel"
- Check that `bun.lock` is committed to git (it should be)
- Check that `prisma generate` runs in the `postinstall` script (it's in `package.json`)
- If using a non-Bun environment, install with `npm install` instead

### "Custom domain not working"
- DNS propagation can take 30+ minutes
- Make sure you added both `@` (apex) and `www` records
- Vercel auto-provisions SSL — wait 5-10 min after DNS propagates

---

## Updating the Deployment

Just push to GitHub's `main` branch:

```bash
git add .
git commit -m "your change"
git push origin main
```

Vercel auto-rebuilds and deploys (~2-3 min). For database schema changes:

```bash
# Locally
bun run db:push   # or: npx prisma db push --accept-data-loss
```

Then redeploy (or just push to trigger a rebuild).

---

## Cost Estimate (Free Tier)

| Service | Free Tier Limit | PlayBeat TV Usage |
|---------|----------------|-------------------|
| Vercel Hobby | 100 GB bandwidth / month, 100 GB-hours of serverless function execution | Light usage well within limits; IPTV proxy traffic is the main cost driver |
| Vercel Postgres (Neon) | 256 MB storage, 60 compute hours / month | 16 tables, ~851 IPTV channels metadata — fits easily |
| GitHub | Unlimited public repos, 2000 actions min/month | Just push events |
| YouTube Data API | 10,000 units/day (one search = 100 units, so 100 searches/day) | Plenty for daily auto-import of 25-50 items |

For higher traffic (multiple concurrent IPTV streams, heavy auto-import), expect to pay ~$20/month for Vercel Pro.

---

## License

MIT — see [LICENSE](./LICENSE). The platform itself is open source. Content streamed through the platform retains its original license (public domain, CC BY, CC BY-SA, etc.).
