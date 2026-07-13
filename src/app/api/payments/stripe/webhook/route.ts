import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET: Stripe redirects here after checkout. Verify the session and activate.
export async function GET(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const paymentId = searchParams.get("payment_id");

  if (!stripeSecret || !sessionId || !paymentId) {
    return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
  }

  try {
    const user = await requireUser();
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const payment = await db.payment.findFirst({
      where: { id: paymentId, userId: user.id },
    });

    if (!payment) {
      return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
    }

    if (session.payment_status === "paid") {
      const plan = PLANS[payment.plan as PlanId];
      const now = new Date();
      const endAt = new Date(now.getTime() + plan.durationDays * 86400000);

      await db.subscription.updateMany({
        where: { userId: user.id, status: "active" },
        data: { status: "expired" },
      });

      await db.subscription.create({
        data: {
          userId: user.id,
          plan: payment.plan,
          amount: payment.amount,
          currency: payment.currency,
          region: user.region,
          status: "active",
          startAt: now,
          endAt,
        },
      });

      await db.payment.update({
        where: { id: payment.id },
        data: { status: "paid", gatewayData: JSON.stringify(session) },
      });

      await db.user.update({
        where: { id: user.id },
        data: { plan: payment.plan, planExpires: endAt },
      });

      return NextResponse.redirect(new URL("/?view=account&payment=success", req.url));
    }

    await db.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    return NextResponse.redirect(new URL("/?view=storefront&payment=failed", req.url));
  } catch {
    return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
  }
}
