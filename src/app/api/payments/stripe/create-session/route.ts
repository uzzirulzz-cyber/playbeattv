import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS, getPlanPrice, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST /api/payments/stripe/create-session { plan }
export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured. Contact support to enable card payments." },
      { status: 503 }
    );
  }

  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const planId = body.plan as PlanId;
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { amount, currency } = getPlanPrice(planId, user.region);

    // Dynamically import Stripe (only when configured).
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const txnRef = `STRIPE_${Date.now()}`;

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        gateway: "stripe",
        amount,
        currency,
        plan: planId,
        txnRef,
        status: "pending",
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `PlayBeat TV — ${plan.name} Subscription`,
              description: `${plan.durationDays} days of premium streaming`,
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        userId: user.id,
        plan: planId,
      },
      success_url: `${origin}/api/payments/stripe/webhook?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`,
      cancel_url: `${origin}/?view=storefront&payment=cancelled`,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { txnRef: session.id },
    });

    return NextResponse.json({ url: session.url, paymentId: payment.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
