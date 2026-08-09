import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { type Enhancer, type GenericContext, withContext } from "./context";
import { UntrustedRequestError } from "./error";

/**
 * Admits only the platform scheduler, by the same shared secret every
 * `/api/cron/*` route checked by hand. Reading the header here rather than in
 * the handler is what lets a cron action take pure parameters — the
 * authorization travels with the context, exactly as `authenticate` does for a
 * session.
 */
export const authorizeCron: Enhancer<
  GenericContext,
  GenericContext,
  Error
> = async (base) => {
  const secret = process.env.CRON_SECRET;

  // An unset secret is a deployment defect, not a caller mistake. Fail closed
  // and let it surface as a 500 — the alternative, treating "no secret" as "no
  // check", would leave every scheduled job publicly triggerable.
  if (!secret)
    return {
      success: false,
      error: new Error("CRON_SECRET is not configured"),
    };

  const request = await headers();
  const authorization = request.get("authorization");

  // A rejection here is the control working, not a defect: these URLs are
  // public, so scanners and hand-run `curl`s reach them and are supposed to
  // bounce. Recording at `warning` and returning an expected error keeps
  // `withContext` from raising it as an exception, while still leaving the one
  // case that *is* ours visible in the same issue — repeated rejections
  // carrying a real credential are a scheduler running a secret this
  // deployment no longer matches, which would silently stop the daily scan and
  // billing runs.
  if (authorization !== `Bearer ${secret}`) {
    // `credential` distinguishes those two populations without ever putting
    // the presented value in Sentry. It rides in `extra` rather than `tags`
    // for the same reason as the Shopify HMAC rail: it comes off an unverified
    // request, and an indexed tag would let forged traffic pollute tag
    // cardinality. The route arrives on its own via the transaction.
    Sentry.captureMessage("Cron authorization rejected", {
      level: "warning",
      tags: { route: "cron" },
      extra: {
        credential: authorization ? "mismatch" : "absent",
        userAgent: request.get("user-agent") ?? "absent",
      },
    });

    return {
      success: false,
      error: new UntrustedRequestError("Unauthorized"),
    };
  }

  return { success: true, data: base };
};

export const withCron = withContext.append(authorizeCron);
