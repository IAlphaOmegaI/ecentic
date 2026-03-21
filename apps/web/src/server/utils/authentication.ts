import { headers } from "next/headers";
import type * as Session from "@/server/app/session";
import type * as User from "@/server/app/user";
import {
  type ContextedAction,
  defineWithContext,
  type Enhancer,
  type GenericContext,
  type WithContextParams,
} from "./context";
import { UnauthenticatedError } from "./error";

export type AuthenticatedContext = GenericContext & {
  session: { user: User.Type; session: Session.Type };
};

export const authenticate: Enhancer<
  GenericContext,
  AuthenticatedContext,
  UnauthenticatedError
> = async (base) => {
  const session = await base.auth.getSession({
    headers: await headers(),
  });

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

export const withAuthentication = <
  T extends ContextedAction<AuthenticatedContext>,
>(
  ...args: WithContextParams<AuthenticatedContext, T>
) => {
  const handler = defineWithContext(authenticate);
  return handler(...args);
};
