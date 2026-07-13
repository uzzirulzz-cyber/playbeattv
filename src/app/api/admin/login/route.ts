import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// POST /api/admin/login { password }
// Verifies the admin password and ensures an admin account exists.
// The password is checked server-side and NEVER sent to the client.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin login is not configured." },
      { status: 503 }
    );
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json(
      { error: "Invalid admin password." },
      { status: 401 }
    );
  }

  // Check if an admin user already exists.
  let admin = await db.user.findFirst({ where: { role: "admin" } });

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@playbeat.live";
  // Hash the admin login password so we can use it for credentials sign-in.
  const hashedAdminPassword = await hashPassword(adminPassword);

  if (!admin) {
    // Create the admin account using the admin login password as the user password.
    admin = await db.user.create({
      data: {
        email: adminEmail,
        name: "PlayBeat Admin",
        password: hashedAdminPassword,
        role: "admin",
        plan: "yearly",
        planExpires: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        region: "PK",
      },
    });
  } else {
    // Sync: update the admin password + ensure active yearly plan.
    admin = await db.user.update({
      where: { id: admin.id },
      data: {
        password: hashedAdminPassword,
        plan: "yearly",
        planExpires: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        role: "admin",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    adminEmail: admin.email,
    adminPassword: adminPassword, // returned to the client ONLY for the credentials sign-in call
    message: "Admin verified. Completing sign-in…",
  });
}
