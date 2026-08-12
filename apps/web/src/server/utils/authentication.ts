import { headers } from "next/headers";
import { cache } from "react";
import type * as Session from "@/server/app/session";
import type * as User from "@/server/app/user";
import { type Enhancer, type GenericContext, withContext } from "./context";
import { UnauthenticatedError } from "./error";

export type AuthenticatedContext = GenericContext & {
  session: { user: User.Type; session: Session.Type };
};

/**
 * One session read per request, shared by every authenticated action.
 *
 * A single dashboard render fans out to well over a dozen authenticated actions
 * — the chrome alone accounts for seven — and each one used to call
 * `getSession` itself. The `cookieCache` in `lib/auth.ts` keeps most of those
 * off the database, but it expires every few minutes, and on the render that
 * misses it every caller would go to the session store at once. Keyed on the
 * auth API object, which `withAuth` attaches per call, so one read serves them
 * all.
 *
 * Outside a request scope React hands back a fresh store per call, degrading to
 * no memoization rather than leaking a session between users.
 */
const readSession = cache(async (api: GenericContext["auth"]) =>
  api.getSession({ headers: await headers() }),
);

export const authenticate: Enhancer<
  GenericContext,
  AuthenticatedContext,
  UnauthenticatedError
> = async (base) => {
  const session = await readSession(base.auth);

  if (!session)
    return {
      success: false,
      error: new UnauthenticatedError("Unauthenticated"),
    };

  base.span.setAttribute("session.id", session.session.id);
  base.span.setAttribute("session.user.id", session.user.id);

  return {
    success: true,
    data: {
      ...base,
      session: {
        user: session.user as User.Type,
        session: session.session as Session.Type,
      },
    },
  };
};

export const withAuthentication = withContext.append(authenticate);
