import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse as Response } from "next/server";
import type Stripe from "stripe";
import { handleStripeEvent } from "@/server/app/billing/stripe-sync";
import { Environment } from "@/server/utils/environment";
import { stripe } from "@/server/utils/stripe";

export const POST = async (request: NextRequest) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret)
    return Response.json(
      { error: "Stripe webhook is not configured" },
      { status: 500 },
    );

  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );

  const body = await request.text();

  const event = await resultify(
    async () =>
      stripe().webhooks.constructEventAsync(
        body,
        signature,
        secret,
      ) as Promise<Stripe.Event>,
  );

  if (!event.success)
    return Response.json(
      { error: "Invalid signature", message: event.error.message },
      { status: 400 },
    );

  const handled = await handleStripeEvent(Environment.SERVER, {
    event: event.data,
  });

  if (!handled.success) {
    console.error("Stripe webhook handler failed", handled.error);
    return Response.json({ received: true, error: true }, { status: 500 });
  }

  return Response.json({ received: true });
};
