import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const ADMIN_BOOTSTRAP_EMAIL =
  process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@playbeat.live";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password, region } = body as {
    name?: string;
    email?: string;
    password?: string;
    region?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashed = await hashPassword(password);
  const isAdmin = normalizedEmail === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
  const userRegion = region?.toUpperCase() || "PK";

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || undefined,
      password: hashed,
      role: isAdmin ? "admin" : "user",
      plan: isAdmin ? "yearly" : "free",
      planExpires: isAdmin
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000)
        : null,
      region: userRegion,
    },
  });

  // If this is the admin account, also sync the admin login password so the
  // admin can sign in via the /admin login form using ADMIN_LOGIN_PASSWORD.
  if (isAdmin && process.env.ADMIN_LOGIN_PASSWORD) {
    const adminHashed = await hashPassword(process.env.ADMIN_LOGIN_PASSWORD);
    await db.user.update({
      where: { id: user.id },
      data: { password: adminHashed },
    });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
