import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const PAYPAL_API_BASE =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

// GET: PayPal redirects here after approval. Capture the payment.
export async function GET(req: NextRequest) {
  const token = await getPayPalAccessToken();
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id");
  const orderId = searchParams.get("token"); // PayPal order ID

  if (!token || !paymentId || !orderId) {
    return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
  }

  try {
    const user = await requireUser();
    const payment = await db.payment.findFirst({
      where: { id: paymentId, userId: user.id },
    });
    if (!payment) {
      return NextResponse.redirect(new URL("/?view=storefront&payment=error", req.url));
    }

    const captureRes = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureRes.ok) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });
      return NextResponse.redirect(new URL("/?view=storefront&payment=failed", req.url));
    }

    const captureData = await captureRes.json();
    const isPaid = captureData.status === "COMPLETED";

    if (isPaid) {
      const plan = PLANS[payment.plan as keyof typeof PLANS];
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
        data: { status: "paid", txnRef: orderId, gatewayData: JSON.stringify(captureData) },
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
