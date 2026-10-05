#!/usr/bin/env bash
# PlayBeat TV — One-line deployment script
#
# Run this on your own machine (not the sandbox — it has no GitHub/Vercel auth).
#
# What this script does:
#   1. Installs Vercel CLI if missing
#   2. Logs you into Vercel (opens browser)
#   3. Provisions a Vercel Postgres database (Neon) in your account
#   4. Sets all required env vars on Vercel
#   5. Deploys to production
#   6. Pushes the Prisma schema to your new database
#   7. Seeds the database (source queries + homepage rows + real Wikimedia import)
#   8. Prints your final URL + admin token
#
# Prerequisites:
#   - A Vercel account (free — sign up at https://vercel.com if you don't have one)
#   - Node.js 18+ and npm
#   - This script must be run from the playbeattv project root (where package.json lives)
#
# Usage:
#   cd /path/to/playbeattv
#   bash deploy.sh
#
# Optional env vars you can set before running:
#   GITHUB_REPO="your-username/playbeattv"   # to also push to GitHub
#   YOUTUBE_API_KEY="..."                    # to enable YouTube auto-import
#   XTREAM_API_KEY="..."                     # to enable Xtream reseller CRUD
#   XTREAM_SERVER_URL="http://..."           # default reseller panel URL

set -e

echo "🚀 PlayBeat TV — Production Deployment"
echo "========================================"

# Sanity check we're in the project root
if [ ! -f "package.json" ] || ! grep -q '"playbeattv"' package.json; then
  echo "❌ Run this script from the playbeattv project root (where package.json lives)."
  exit 1
fi

# 1. Install Vercel CLI if missing
if ! command -v vercel &>/dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

# 2. Log in to Vercel (opens browser)
echo ""
echo "🔐 Step 1/7: Logging into Vercel..."
vercel whoami 2>/dev/null || vercel login

# 3. Link project (creates a new one if not linked)
echo ""
echo "📦 Step 2/7: Linking project to Vercel..."
vercel link --yes

# 4. Create a Vercel Postgres database (Neon)
echo ""
echo "🗄️  Step 3/7: Provisioning Vercel Postgres database..."
PROJECT_NAME=$(vercel project ls 2>/dev/null | grep -oE '^playbeattv[a-z0-9-]*' | head -1 || echo "playbeattv")
echo "   Project name: $PROJECT_NAME"

# Try to create a Postgres store; if it already exists, link it
DB_NAME="${PROJECT_NAME//-/}-db"
vercel postgres create "$DB_NAME" 2>/dev/null || true
vercel env link "$DB_NAME" 2>/dev/null || true

# Pull the DATABASE_URL
echo "   Fetching DATABASE_URL..."
DATABASE_URL=$(vercel env pull --environment=production 2>/dev/null | grep -E "^DATABASE_URL=" | sed 's/^DATABASE_URL=//' | tr -d '"' || echo "")

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  Could not auto-fetch DATABASE_URL. Please:"
  echo "   1. Open your Vercel dashboard"
  echo "   2. Go to: Storage → $DB_NAME → .env.local tab"
  echo "   3. Copy the DATABASE_URL value"
  echo "   4. Run: vercel env add DATABASE_URL production"
  echo "   5. Re-run this script"
  exit 1
fi
echo "   ✅ DATABASE_URL set"

# 5. Set required env vars
echo ""
echo "🔐 Step 4/7: Setting environment variables..."

# Generate random secrets
ADMIN_TOKEN=$(openssl rand -hex 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "$ADMIN_TOKEN" | vercel env add ADMIN_TOKEN production
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production

# Optional vars
if [ -n "$YOUTUBE_API_KEY" ]; then
  echo "$YOUTUBE_API_KEY" | vercel env add YOUTUBE_API_KEY production
  echo "   ✅ YOUTUBE_API_KEY set"
fi
if [ -n "$XTREAM_API_KEY" ]; then
  echo "$XTREAM_API_KEY" | vercel env add XTREAM_API_KEY production
  echo "   ✅ XTREAM_API_KEY set"
fi
if [ -n "$XTREAM_SERVER_URL" ]; then
  echo "$XTREAM_SERVER_URL" | vercel env add XTREAM_SERVER_URL production
  echo "   ✅ XTREAM_SERVER_URL set"
fi

echo "   ✅ ADMIN_TOKEN: $ADMIN_TOKEN (SAVE THIS — you'll need it to log in to /admin)"
echo "   ✅ NEXTAUTH_SECRET set"

# 6. Deploy to production
echo ""
echo "🚀 Step 5/7: Deploying to production..."
DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep -oE 'https://[a-z0-9-]*\.vercel\.app' | head -1)
echo "   ✅ Deployed to: $DEPLOY_URL"

# 7. Push Prisma schema + seed
echo ""
echo "🗄️  Step 6/7: Pushing database schema + seeding..."
export DATABASE_URL
npx prisma db push --accept-data-loss
npx tsx scripts/seed.ts
echo "   ✅ Schema pushed + database seeded"

# 8. (Optional) Push to GitHub
if [ -n "$GITHUB_REPO" ]; then
  echo ""
  echo "🐙 Step 7/7: Pushing to GitHub..."
  if ! command -v gh &>/dev/null; then
    echo "   Installing GitHub CLI..."
    # macOS: brew install gh
    # Linux: see https://github.com/cli/cli/blob/trunk/docs/install_linux.md
  fi
  if ! git remote get-url origin &>/dev/null; then
    gh repo create "$GITHUB_REPO" --public --source=. --remote=origin --push
  else
    git push -u origin main
  fi
  echo "   ✅ Pushed to: https://github.com/$GITHUB_REPO"
else
  echo ""
  echo "ℹ️  Step 7/7: Skipping GitHub push (set GITHUB_REPO env var to enable)"
fi

# Done
echo ""
echo "========================================"
echo "🎉 Deployment complete!"
echo ""
echo "   URL:         $DEPLOY_URL"
echo "   Admin login: $ADMIN_TOKEN"
echo "   Admin URL:   $DEPLOY_URL/#view=admin"
echo ""
echo "   Next steps:"
echo "   1. Visit $DEPLOY_URL in your browser"
echo "   2. Click 'Admin' in the top nav"
echo "   3. Paste the admin token above to log in"
echo "   4. (Optional) Add a custom domain in Vercel → Settings → Domains"
echo "      DNS: A record @ → 76.76.21.21, CNAME www → cname.vercel-dns.com"
echo ""
echo "   ⚠️  SAVE YOUR ADMIN TOKEN — it cannot be recovered."
echo "   (It's also stored in your Vercel env vars under ADMIN_TOKEN)"
echo "========================================"
