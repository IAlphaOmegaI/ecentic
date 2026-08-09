import { headers } from "next/headers";
import { type Enhancer, type GenericContext, withContext } from "./context";
import { UnauthenticatedError } from "./error";

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

  const authorization = (await headers()).get("authorization");

  if (authorization !== `Bearer ${secret}`)
    return {
      success: false,
      error: new UnauthenticatedError("Unauthorized"),
    };

  return { success: true, data: base };
};

export const withCron = withContext.append(authorizeCron);
