import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST /api/subscription { plan: "monthly"|"quarterly"|"yearly" }
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const planId = body.plan as PlanId;
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const now = new Date();
    const endAt = new Date(now.getTime() + plan.durationDays * 86400000);

    // Mark previous active subscriptions as expired.
    await db.subscription.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "expired" },
    });

    const sub = await db.subscription.create({
      data: {
        userId: user.id,
        plan: plan.id,
        amount: plan.price,
        currency: plan.currency,
        status: "active",
        startAt: now,
        endAt,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { plan: plan.id, planExpires: endAt },
    });

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}
