import { NextRequest, NextResponse } from "next/server";

// --- Security Firewall ---
// Adds security headers, blocks suspicious requests, and rate-limits auth endpoints.

const AUTH_RATE_LIMIT = 30; // max attempts per window
const AUTH_WINDOW_MS = 60 * 1000; // 1 minute
const GENERAL_RATE_LIMIT = 200; // max requests per window for streaming
const GENERAL_WINDOW_MS = 60 * 1000;

interface RateBucket {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (per-instance; fine for single-server deploys).
const rateStore = new Map<string, RateBucket>();

function checkRate(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    const newBucket: RateBucket = { count: 1, resetAt: now + windowMs };
    rateStore.set(key, newBucket);
    return { ok: true, remaining: limit - 1, resetAt: newBucket.resetAt };
  }
  bucket.count++;
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

// Blocked user-agents (common scanner/bot patterns)
const BLOCKED_UA = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /acunetix/i,
  /nessus/i,
  /burp/i,
  /hydra/i,
  /dirbuster/i,
  /gobuster/i,
];

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const ua = req.headers.get("user-agent") || "";

  // 1. Block suspicious user agents
  if (BLOCKED_UA.some((re) => re.test(ua))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Block path traversal / encoded attacks
  const decodedPath = decodeURIComponent(pathname);
  if (
    decodedPath.includes("..") ||
    decodedPath.includes("\0") ||
    /\/\.{1,2}\//.test(decodedPath)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ip = getClientIp(req);

  // 3. Rate-limit auth endpoints (brute-force protection)
  if (pathname.startsWith("/api/auth/") && method === "POST") {
    const key = `auth:${ip}`;
    const { ok, remaining, resetAt } = checkRate(key, AUTH_RATE_LIMIT, AUTH_WINDOW_MS);
    if (!ok) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "retry-after": String(retryAfter),
            "x-ratelimit-remaining": "0",
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set("x-ratelimit-remaining", String(remaining));
    return res;
  }

  // 4. Rate-limit streaming endpoints (abuse protection)
  if (pathname.startsWith("/api/stream")) {
    const key = `stream:${ip}`;
    const { ok, remaining, resetAt } = checkRate(key, GENERAL_RATE_LIMIT, GENERAL_WINDOW_MS);
    if (!ok) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "retry-after": String(retryAfter) },
      });
    }
    const res = NextResponse.next();
    res.headers.set("x-ratelimit-remaining", String(remaining));
    return res;
  }

  // 5. Security headers on all responses
  const res = NextResponse.next();
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("x-xss-protection", "1; mode=block");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(self)");
  // CSP: allow inline styles (Tailwind/Next), scripts (Next), images from anywhere,
  // media from same-origin (proxy), and AdSense.
  res.headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: http:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https:",
      "font-src 'self' data:",
      "frame-src https://googleads.g.doubleclick.net https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );
  return res;
}

export const config = {
  matcher: [
    // Apply to all API routes and pages except static assets
    "/((?!_next/static|_next/image|favicon.ico|ads.txt|robots.txt|logo.svg).*)",
  ],
};
