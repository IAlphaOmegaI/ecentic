"use server";
import { render } from "@react-email/components";
import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { Resend } from "resend";
import { VerifyEmail } from "@/public/templates/verify";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { InvalidCredentialsError, NotFoundError } from "../utils/error";
import * as User from "./user";

const parseName = (fullName: string): { name: string; surname: string } => {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { name: trimmed, surname: trimmed };
  return {
    name: trimmed.slice(0, spaceIndex),
    surname: trimmed.slice(spaceIndex + 1).trim() || trimmed,
  };
};

export const signInWithGoogle = withContext(
  async (context, { callbackURL }: { callbackURL: string }) => {
    const result = await resultify(
      async () =>
        await context.auth.signInSocial({
          body: {
            provider: "google",
            callbackURL,
            newUserCallbackURL: "/complete-profile",
            disableRedirect: true,
          },
        }),
    );

    if (!result.success) {
      return {
        success: false,
        error: new InvalidCredentialsError("Google sign-in failed", {
          cause: result.error,
        }),
      };
    }

    if (!result.data.url) {
      return {
        success: false,
        error: new InvalidCredentialsError("Google sign-in failed"),
      };
    }

    return { success: true, data: { url: result.data.url } };
  },
  "Authentication.signInWithGoogle",
);

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

    context.span.addBreadcrumb({
      category: "auth.sign_in",
      data: { "user.id": result.data.user.id, "user.email": email },
    });

    const jar = await cookies();

    const user = await User.get(Environment.SERVER, result.data.user.id);

    if (!user.success) {
      return {
        success: false,
        error: new InvalidCredentialsError("Invalid credentials provided", {
          cause: user.error,
        }),
      };
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

export const signOut = withContext(async (context) => {
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
  async (context) => {
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
  ) => {
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
  async (context, { email }: { email: string }) => {
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

export const getProxiedCurrentUser = withContext(async (context) => {
  const jar = await cookies();
  const cached = jar.get("user")?.value;

  if (cached) {
    return { success: true, data: JSON.parse(cached) as User.Type };
  }

  const session = await context.auth.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: new Error("user-not-found") };
  }

  const user = await User.get(Environment.SERVER, session.user.id);
  if (!user.success) return user;

  if (!user.data) return { success: false, error: new Error("user-not-found") };

  jar.set("user", JSON.stringify(user.data));

  return user;
}, "Authentication.getProxiedCurrentUser");

export const changePassword = withAuthentication(
  async (
    context,
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
  ) => {
    const result = await resultify(async () =>
      context.auth.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        },
      }),
    );

    if (!result.success) {
      return {
        success: false,
        error: new InvalidCredentialsError("Current password is incorrect", {
          cause: result.error,
        }),
      };
    }

    return { success: true };
  },
  "Authentication.changePassword",
);

export const doesEmailExist = withContext(
  async (_, { email }: { email: string }) => {
    const users = await User.find(Environment.SERVER, {
      where: eq(schema.user.email, email),
    });

    if (!users.success) return users;
    return { success: true, data: users.data.length > 0 };
  },
  "Authentication.getDoesEmailExist",
);

export const signUp = withContext(
  async (
    context,
    payload: {
      email: string;
      password: string;
      fullName: string;
      company?: string;
      jobTitle?: string;
      source?: string;
    },
  ) => {
    const { name, surname } = parseName(payload.fullName);

    const result = await resultify(
      async () =>
        await context.auth.signUpEmail({
          body: {
            name,
            surname,
            email: payload.email,
            password: payload.password,
            callbackURL: `${process.env.APP_HOST}/verify/success`,
            role: "user",
            jobTitle: payload.jobTitle,
            company: payload.company,
            source: payload.source,
          },
        }),
    );

    if (!result.success) {
      return {
        success: false,
        error: new InvalidCredentialsError(
          result.error?.message ?? "Sign up failed",
          { cause: result.error },
        ),
      };
    }

    context.span.addBreadcrumb({
      category: "auth.sign_up",
      data: { "user.email": payload.email },
    });

    return {
      success: true,
      data: {
        message:
          "Account created. Please check your email to verify your address.",
      },
    };
  },
  "Authentication.signUp",
);

export const verifyEmail = withContext(
  async (
    _context,
    token: string,
  ) => {
    const callbackUrl = `${process.env.APP_HOST}/verify/success`;
    const redirectUrl = `${process.env.APP_HOST}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackUrl)}`;
    return {
      success: true,
      data: { redirectUrl },
    };
  },
  "Authentication.verifyEmail",
);

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends the verification email. Do not await in the caller to avoid timing attacks.
 */
export const sendVerificationEmail = async ({
  to,
  verificationUrl,
}: {
  to: string;
  verificationUrl: string;
}) => {
  const html = await render(
    VerifyEmail({
      verificationUrl,
      userEmail: to,
    }),
  );

  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
    to,
    subject: "Verify your email address",
    html,
  });

  if (result.error) {
    throw result.error;
  }
};
