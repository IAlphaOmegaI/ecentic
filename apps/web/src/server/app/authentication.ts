"use server";
import { render } from "@react-email/components";
import { type Result, resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { Resend } from "resend";
import {
  authEmailSchema,
  signInPasswordSchema,
  signUpPasswordSchema,
} from "@/lib/auth-form-schema";
import { VerifyEmail } from "@/public/templates/verify";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import {
  InvalidCredentialsError,
  NotFoundError,
  RequestError,
  type UnauthenticatedError,
} from "../utils/error";
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

export const signIn = withContext(
  async (context, { email, password }: { email: string; password: string }) => {
    const emailParsed = authEmailSchema.safeParse(email);
    if (!emailParsed.success) {
      return {
        success: false,
        error: new RequestError(
          emailParsed.error.issues[0]?.message ?? "Invalid email address",
        ),
      };
    }

    const passwordParsed = signInPasswordSchema.safeParse(password);
    if (!passwordParsed.success) {
      return {
        success: false,
        error: new RequestError(
          passwordParsed.error.issues[0]?.message ?? "Invalid password",
        ),
      };
    }

    const result = await resultify(
      async () =>
        await context.auth.signInEmail({
          body: {
            email: emailParsed.data,
            password: passwordParsed.data,
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
      data: { "user.id": result.data.user.id, "user.email": emailParsed.data },
    });

    const jar = await cookies();

    const user = await User.get(Environment.SERVER, result.data.user.id);

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

  const u = JSON.parse(user) as User.Type;

  return {
    success: true,
    data: u,
  };
}, "Authentication.getProxiedCurrentUser");

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
      role?: string;
    },
  ): Promise<Result<{ message: string }, Error>> => {
    const emailParsed = authEmailSchema.safeParse(payload.email);
    if (!emailParsed.success) {
      return {
        success: false,
        error: new RequestError(
          emailParsed.error.issues[0]?.message ?? "Invalid email address",
        ),
      };
    }

    const passwordParsed = signUpPasswordSchema.safeParse(payload.password);
    if (!passwordParsed.success) {
      return {
        success: false,
        error: new RequestError(
          passwordParsed.error.issues[0]?.message ?? "Invalid password",
        ),
      };
    }

    const { name, surname } = parseName(payload.fullName);

    const result = await resultify(
      async () =>
        await context.auth.signUpEmail({
          body: {
            name,
            surname,
            email: emailParsed.data,
            password: passwordParsed.data,
            ...(payload.role !== undefined && { role: payload.role }),
            callbackURL: `${process.env.APP_HOST}/onboarding/connect`,
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
  ): Promise<Result<{ redirectUrl: string }, Error>> => {
    const callbackUrl = `${process.env.APP_HOST}/onboarding/connect`;
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
