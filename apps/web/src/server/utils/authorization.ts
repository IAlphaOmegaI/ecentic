import type { UserRole } from "@/server/database/validators";
import { type AuthenticatedContext, authenticate } from "./authentication";
import {
  type ContextedAction,
  defineWithContext,
  type Enhancer,
  pipe,
  type WithContextParams,
} from "./context";
import { UnauthorizedError } from "./error";

export const authorize = (
  allowedRoles: UserRole[],
): Enhancer<AuthenticatedContext, AuthenticatedContext, UnauthorizedError> => {
  return async (context) => {
    const userRole = context.session.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: new UnauthorizedError(
          `Insufficient permissions. Required role(s): ${allowedRoles.join(", ")}`,
        ),
      };
    }

    context.span.setAttribute("session.user.role", userRole);

    return { success: true, data: context };
  };
};

export const withAuthorization = <
  T extends ContextedAction<AuthenticatedContext>,
>(
  allowedRoles: UserRole[],
  ...args: WithContextParams<AuthenticatedContext, T>
) => {
  const handler = defineWithContext(
    pipe(authenticate, authorize(allowedRoles)),
  );
  return handler(...args);
};
