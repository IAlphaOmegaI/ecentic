import type { UserRole } from "@/server/database/validators";
import { type AuthenticatedContext, authenticate } from "./authentication";
import {
  type ContextedAction,
  type Enhancer,
  type WithContextParams,
  withContext,
} from "./context";
import { UnauthorizedError } from "./error";

export const authorize =
  (
    roles: UserRole[],
  ): Enhancer<AuthenticatedContext, AuthenticatedContext, UnauthorizedError> =>
  async (context) => {
    if (!roles.some((role) => role === context.session.user.role))
      return {
        success: false,
        error: new UnauthorizedError(
          "This application is available to ecentic staff only.",
        ),
      };
    return { success: true, data: context };
  };

export const withAuthorization = <
  Action extends ContextedAction<AuthenticatedContext>,
>(
  roles: UserRole[],
  ...arguments_: WithContextParams<AuthenticatedContext, Action>
) => withContext.append(authenticate).append(authorize(roles))(...arguments_);
