import type { UserRole } from "@/server/database/validators";
import { type AuthenticatedContext, authenticate } from "./authentication";
import {
  type ContextedAction,
  type Enhancer,
  type WithContextParams,
  withContext,
} from "./context";
import { UnauthorizedError } from "./error";

export const authorize = (
  whitelist: UserRole[],
): Enhancer<AuthenticatedContext, AuthenticatedContext, UnauthorizedError> => {
  return async (context) => {
    // `role` is a nullable text column, so the session can carry anything —
    // including a value from a vocabulary that says nothing about permissions
    // here. Compare without asserting the type: an unrecognized role simply
    // fails the membership check rather than being cast into the union.
    const current = context.session.user.role;

    if (!whitelist.some((role) => role === current))
      return {
        success: false,
        error: new UnauthorizedError(
          `Insufficient permissions. Required role(s): ${whitelist.join(", ")}`,
        ),
      };

    context.span.setAttribute("session.user.role", current ?? "none");

    return { success: true, data: context };
  };
};

export const withAuthorization = <
  T extends ContextedAction<AuthenticatedContext>,
>(
  whitelist: UserRole[],
  ...args: WithContextParams<AuthenticatedContext, T>
) => withContext.append(authenticate).append(authorize(whitelist))(...args);
