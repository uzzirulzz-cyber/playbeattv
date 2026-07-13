import { NextRequest, NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PLANS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET /api/admin/subscriptions — list all active subscriptions
export async function GET() {
  try {
    await requireAdmin();
    const subs = await withRetry(() =>
      db.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      })
    );
    return NextResponse.json({ subscriptions: subs });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Server error" },
      { status }
    );
  }
}

// POST /api/admin/subscriptions { userId, plan, durationDays? }
// Creates/activates a subscription for any user.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const { userId, plan, durationDays } = body as {
      userId?: string;
      plan?: PlanId;
      durationDays?: number;
    };

    if (!userId || !plan) {
      return NextResponse.json(
        { error: "userId and plan are required" },
        { status: 400 }
      );
    }

    const planObj = PLANS[plan];
    if (!planObj) {
      return NextResponse.json(
        { error: "Invalid plan. Use: monthly, quarterly, or yearly" },
        { status: 400 }
      );
    }

    const user = await withRetry(() =>
      db.user.findUnique({ where: { id: userId } })
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const days = durationDays || planObj.durationDays;
    const now = new Date();
    const endAt = new Date(now.getTime() + days * 86400000);

    // Expire any existing active subscriptions for this user.
    await withRetry(() =>
      db.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired" },
      })
    );

    // Create the new active subscription.
    const sub = await withRetry(() =>
      db.subscription.create({
        data: {
          userId,
          plan,
          amount: 0, // Admin-activated (no payment)
          currency: "ADMIN",
          region: user.region || "PK",
          status: "active",
          startAt: now,
          endAt,
        },
      })
    );

    // Update the user's plan + expiry.
    await withRetry(() =>
      db.user.update({
        where: { id: userId },
        data: { plan, planExpires: endAt },
      })
    );

    return NextResponse.json({
      ok: true,
      subscription: sub,
      user: { id: user.id, email: user.email, plan, planExpires: endAt },
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Server error" },
      { status }
    );
  }
}

// DELETE /api/admin/subscriptions?userId=... OR ?id=...
// Cancels a subscription (by subscription ID or by user ID)
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id && !userId) {
      return NextResponse.json(
        { error: "id or userId required" },
        { status: 400 }
      );
    }

    let sub;
    if (userId) {
      // Find the user's active subscription
      sub = await withRetry(() =>
        db.subscription.findFirst({
          where: { userId, status: "active" },
        })
      );
    } else {
      sub = await withRetry(() =>
        db.subscription.findUnique({ where: { id: id! } })
      );
    }

    if (!sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await withRetry(() =>
      db.subscription.update({
        where: { id: sub.id },
        data: { status: "cancelled" },
      })
    );

    // Downgrade the user to free
    await withRetry(() =>
      db.user.update({
        where: { id: sub.userId },
        data: { plan: "free", planExpires: null },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Server error" },
      { status }
    );
  }
}
