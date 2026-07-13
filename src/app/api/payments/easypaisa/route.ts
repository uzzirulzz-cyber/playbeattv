import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS, getPlanPrice, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST /api/payments/easypaisa { plan }
// EasyPaisa is manual: user sends money to 03390005715, then enters txn ID.
// We create a pending payment for admin confirmation.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const planId = body.plan as PlanId;
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { amount, currency } = getPlanPrice(planId, user.region);
    const txnRef = `EP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        gateway: "easypaisa",
        amount,
        currency,
        plan: planId,
        txnRef,
        status: "pending",
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount,
      currency,
      number: process.env.EASYPAISA_NUMBER || "03390005715",
      instructions: [
        `Send ${currency} ${amount.toLocaleString()} to EasyPaisa: 03390005715`,
        "Use your registered phone number to send the payment",
        `Note the Transaction ID / TID from the confirmation SMS`,
        `Enter the TID below to confirm your subscription`,
      ],
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}

// POST /api/payments/easypaisa/confirm { paymentId, txnId }
// User submits their EasyPaisa TID; admin must approve it.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { paymentId, txnId } = body as { paymentId?: string; txnId?: string };
    if (!paymentId || !txnId) {
      return NextResponse.json(
        { error: "paymentId and txnId are required" },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: { id: paymentId, userId: user.id },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        gatewayData: JSON.stringify({ easypaisaTID: txnId, submittedAt: new Date() }),
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Your EasyPaisa transaction ID has been submitted. Your subscription will be activated within 1-2 hours after verification.",
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}
