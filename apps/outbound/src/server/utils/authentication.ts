import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import type * as User from "@/server/app/user";
import type { schema } from "@/server/database";
import { type Enhancer, type GenericContext, withContext } from "./context";
import { UnauthenticatedError } from "./error";

export type AuthenticatedContext = GenericContext & {
  session: {
    user: User.Type;
    session: typeof schema.session.$inferSelect;
  };
};

const readSession = cache(async (api: GenericContext["auth"]) => {
  await connection();
  return api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});

export const authenticate: Enhancer<
  GenericContext,
  AuthenticatedContext,
  UnauthenticatedError
> = async (context) => {
  const session = await readSession(context.auth);
  if (!session)
    return {
      success: false,
      error: new UnauthenticatedError("Unauthenticated"),
    };
  return {
    success: true,
    data: {
      ...context,
      session: {
        user: session.user as User.Type,
        session: session.session as typeof schema.session.$inferSelect,
      },
    },
  };
};

export const withAuthentication = withContext.append(authenticate);
