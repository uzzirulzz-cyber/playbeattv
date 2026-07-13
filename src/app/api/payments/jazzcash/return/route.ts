import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyJazzCashResponse, parseJazzCashResponse } from "@/lib/jazzcash";
import { PLANS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// JazzCash redirects the user back here via POST with the payment result.
// We verify the hash, update the payment record, and activate the subscription.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const response: Record<string, string> = {};
    formData.forEach((value, key) => {
      response[key] = String(value);
    });

    const authentic = verifyJazzCashResponse(response);
    const result = parseJazzCashResponse(response);

    // Find the payment by txn ref.
    const payment = await db.payment.findFirst({
      where: { txnRef: result.txnRef },
    });

    if (!payment) {
      return NextResponse.redirect(new URL("/?view=account&payment=notfound", req.url));
    }

    const isSuccess = authentic && result.success;

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: isSuccess ? "paid" : "failed",
        gatewayData: JSON.stringify(response),
      },
    });

    if (isSuccess) {
      const plan = PLANS[payment.plan as PlanId];
      if (plan) {
        const now = new Date();
        const endAt = new Date(now.getTime() + plan.durationDays * 86400000);

        await db.subscription.updateMany({
          where: { userId: payment.userId, status: "active" },
          data: { status: "expired" },
        });

        await db.subscription.create({
          data: {
            userId: payment.userId,
            plan: payment.plan,
            amount: payment.amount,
            currency: payment.currency,
            region: "PK",
            status: "active",
            startAt: now,
            endAt,
          },
        });

        await db.user.update({
          where: { id: payment.userId },
          data: { plan: payment.plan, planExpires: endAt },
        });

        return NextResponse.redirect(
          new URL("/?view=account&payment=success", req.url)
        );
      }
    }

    return NextResponse.redirect(
      new URL("/?view=storefront&payment=failed", req.url)
    );
  } catch {
    return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
  }
}

// JazzCash may also GET the return URL in some flows.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/?view=account", req.url));
}
