import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildJazzCashRequest, generateTxnRefNo } from "@/lib/jazzcash";
import { PLANS, getPlanPrice, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST /api/payments/jazzcash/initiate { plan }
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const planId = body.plan as PlanId;
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // JazzCash only accepts PKR.
    const { amount, currency } = getPlanPrice(planId, user.region);
    if (currency !== "PKR") {
      return NextResponse.json(
        { error: "JazzCash only supports PKR. Select EasyPaisa or change region to Pakistan." },
        { status: 400 }
      );
    }

    const txnRef = generateTxnRefNo();

    // Create a pending payment record.
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        gateway: "jazzcash",
        amount,
        currency: "PKR",
        plan: planId,
        txnRef,
        status: "pending",
      },
    });

    const { fields, action } = buildJazzCashRequest({
      txnRefNo: txnRef,
      amount,
      description: `PlayBeat TV ${plan.name} subscription`,
      billReference: payment.id,
    });

    return NextResponse.json({
      paymentId: payment.id,
      action,
      fields,
      method: "POST",
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}
