# PlayBeat TV 🎬

Premium IPTV streaming platform — Live TV, Movies & Series.

## Features

- **Live TV, Movies, Series** — 10,000+ channels with HLS streaming
- **User Authentication** — Email, Google, Facebook sign-in (NextAuth.js)
- **Subscription System** — Monthly/Quarterly/Annual plans with region-wise pricing
- **Payment Gateways** — JazzCash, EasyPaisa, Stripe, PayPal
- **Custom Categories** — News, Sports, Movies, Entertainment, Music, Regional, Hindi, Pakistan, India, Bangladesh, and more
- **10% Free Preview** — Non-members see 10% of content; members get full access
- **Admin Panel** — User management, backend config, stats dashboard
- **Security Firewall** — Rate limiting, security headers, scanner blocking
- **Bot Handler** — 30s health checks, subscription expiry, cleanup
- **AdSense** — Banner + in-feed ads integrated
- **Responsive** — Mobile-first design with dark/light themes

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite dev / MongoDB Atlas production)
- **Auth**: NextAuth.js v4
- **Streaming**: hls.js (client) + server-side proxy (credential hiding)
- **State**: Zustand + TanStack Query
- **Payments**: JazzCash (HMAC-SHA256), EasyPaisa, Stripe, PayPal

## Quick Start

```bash
# Install dependencies
bun install

# Copy env template and fill in your values
cp .env.example .env

# Set up the database
bun run db:push

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

### Admin Access

The first user to sign up with `ADMIN_BOOTSTRAP_EMAIL` (default: `admin@playbeat.live`) automatically becomes an admin.

### OAuth Setup (optional)

Add Google/Facebook OAuth credentials to `.env` to enable social login:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

### Payment Setup

- **JazzCash**: Add your merchant ID, password, and integrity salt
- **EasyPaisa**: Set your EasyPaisa number (default: 03390005715)
- **Stripe**: Add `STRIPE_SECRET_KEY`
- **PayPal**: Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

## Database

The schema is compatible with both SQLite (dev) and MongoDB Atlas (production).

To switch to MongoDB:
1. Set `MONGODB_URI` in `.env`
2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "mongodb"  // was "sqlite"
     url      = env("MONGODB_URI")
   }
   ```
3. Run `bun run db:push`

## Security

- All IPTV backend credentials are hidden behind a server-side proxy (`/api/stream`)
- Rate limiting on auth (10/min) and streaming (120/min) endpoints
- CSP, X-Frame-Options, X-Content-Type-Options, and other security headers
- Passwords hashed with bcrypt
- Path traversal and scanner blocking

## License

© PlayBeat TV. All rights reserved.
