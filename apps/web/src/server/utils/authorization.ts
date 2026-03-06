import { headers } from "next/headers";
import type * as Session from "@/server/app/session";
import type * as User from "@/server/app/user";
import type { UserRole } from "@/server/database/validators";
import {
  type ContextedAction,
  defineWithContext,
  type GenericContext,
  type WithContextParams,
} from "./context";
import { UnauthenticatedError, UnauthorizedError } from "./error";

type AuthedContext = GenericContext & {
  session: { user: User.Type; session: Session.Type };
};

export const withAuthorization = <T extends ContextedAction<AuthedContext>>(
  allowedRoles: UserRole[],
  ...args: WithContextParams<AuthedContext, T>
) => {
  const handler = defineWithContext(async (base) => {
    const session = await base.auth.getSession({
      headers: await headers(),
    });

    if (!session?.user.role)
      return {
        success: false,
        error: new UnauthenticatedError("Unauthenticated"),
      };

    const userRole = session.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: new UnauthorizedError(
          `Insufficient permissions. Required role(s): ${allowedRoles.join(", ")}`,
        ),
      };
    }

    base.span.setAttribute("session.id", session.session.id);
    base.span.setAttribute("session.user.id", session.user.id);
    base.span.setAttribute("session.user.role", userRole);

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
  });

  return handler(...args);
};
