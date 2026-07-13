import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PLANS, getPlanPrice, type PlanId } from "@/lib/plans";

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

// POST /api/payments/paypal/create-order { plan }
export async function POST(req: NextRequest) {
  const token = await getPayPalAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "PayPal is not configured. Contact support to enable PayPal." },
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
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        gateway: "paypal",
        amount,
        currency,
        plan: planId,
        status: "pending",
      },
    });

    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: `PlayBeat TV — ${plan.name} subscription`,
            custom_id: payment.id,
          },
        ],
        application_context: {
          brand_name: "PlayBeat TV",
          return_url: `${origin}/api/payments/paypal/capture?payment_id=${payment.id}`,
          cancel_url: `${origin}/?view=storefront&payment=cancelled`,
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json({ error: `PayPal error: ${err}` }, { status: 502 });
    }

    const order = await orderRes.json();
    await db.payment.update({
      where: { id: payment.id },
      data: { txnRef: order.id },
    });

    const approveLink = order.links?.find((l: { rel: string; href: string }) => l.rel === "approve");
    return NextResponse.json({ url: approveLink?.href, orderId: order.id, paymentId: payment.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PayPal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
