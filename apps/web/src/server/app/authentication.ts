"use server";
import { type Result, resultify } from "@zenncore/utils";
import { cookies, headers } from "next/headers";

import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import {
  InvalidCredentialsError,
  NotFoundError,
  type UnauthenticatedError,
} from "../utils/error";
import * as User from "./user";

export const signIn = withContext(
  async (context, { email, password }: { email: string; password: string }) => {
    const result = await resultify(
      async () =>
        await context.auth.signInEmail({
          body: {
            email,
            password,
          },
        }),
    );

    if (!result.success) {
      return {
        success: false,
        error: new InvalidCredentialsError("Invalid credentials provided", {
          cause: result.error,
        }),
      };
    }

    const jar = await cookies();

    const user = await User.get(result.data.user.id);

    if (!user.success) {
      throw new InvalidCredentialsError("Invalid credentials provided", {
        cause: user.error,
      });
    }

    jar.set("user", JSON.stringify(user.data));

    if (!user.data) {
      return {
        success: false,
        error: new InvalidCredentialsError("Invalid credentials provided", {
          cause: new NotFoundError("User not found"),
        }),
      };
    }

    return user;
  },
  "Authentication.signIn",
);

export const signOut = withContext(async (context): Promise<Result> => {
  const result = await resultify(
    async () =>
      await context.auth.signOut({
        headers: await headers(),
      }),
  );

  if (!result.success) return result;

  const jar = await cookies();
  jar.delete("user");

  return {
    success: true,
  };
}, "Authentication.signOut");

export const getCurrentUser = withAuthentication(
  async (context): Promise<Result<User.Type, UnauthenticatedError>> => {
    return {
      success: true,
      data: context.session.user,
    };
  },
  "Authentication.getCurrentUser",
);

export const resetPassword = withContext(
  async (
    context,
    { token, password }: { token: string; password: string },
  ): Promise<Result> => {
    const { status } = await context.auth.resetPassword({
      body: {
        token,
        newPassword: password,
      },
    });

    if (!status) {
      return {
        success: false,
        error: new Error("reset-password-failed"),
      };
    }

    return { success: true };
  },
  "Authentication.resetPassword",
);

export const forgotPassword = withContext(
  async (context, { email }: { email: string }): Promise<Result> => {
    const { status } = await context.auth.requestPasswordReset({
      body: {
        email,
        redirectTo: "/",
      },
    });

    if (!status) {
      return {
        success: false,
        error: new Error("request-password-reset-failed"),
      };
    }

    return {
      success: true,
    };
  },
  "Authentication.forgotPassword",
);

export const getProxiedCurrentUser = withContext(async () => {
  const jar = await cookies();
  const user = jar.get("user")?.value;

  if (!user) {
    return {
      success: false,
      error: new Error("user-not-found"),
    };
  }

  return JSON.parse(user) as User.Type;
}, "Authentication.getProxiedCurrentUser");

export const doesEmailExist = withContext(
  async (_, { email }: { email: string }) => {
    const users = await User.find({ where: { email } });
    if (!users.success) return users;
    return { success: true, data: users.data.length > 0 };
  },
  "Authentication.getDoesEmailExist",
);
