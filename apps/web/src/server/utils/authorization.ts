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
  whitelist: UserRole[],
): Enhancer<AuthenticatedContext, AuthenticatedContext, UnauthorizedError> => {
  return async (context) => {
    const current = context.session.user.role as UserRole;

    if (!whitelist.includes(current)) {
      return {
        success: false,
        error: new UnauthorizedError(
          `Insufficient permissions. Required role(s): ${whitelist.join(", ")}`,
        ),
      };
    }

    context.span.setAttribute("session.user.role", current);

    return { success: true, data: context };
  };
};

export const withAuthorization = <
  T extends ContextedAction<AuthenticatedContext>,
>(
  whitelist: UserRole[],
  ...args: WithContextParams<AuthenticatedContext, T>
) => {
  const handler = defineWithContext(pipe(authenticate, authorize(whitelist)));
  return handler(...args);
};
