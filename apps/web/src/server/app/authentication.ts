"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { render } from "react-email";
import { Resend } from "resend";
import { sanitizeRedirect } from "@/lib/redirect";
import { VerifyEmail } from "@/public/templates/verify";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { InvalidCredentialsError } from "../utils/error";
import * as User from "./user";

// TODO: use betterAuth client instead of server actions (default redirection)

const parseName = (fullName: string): { name: string; surname: string } => {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) return { name: trimmed, surname: trimmed };
  return {
    name: trimmed.slice(0, spaceIndex),
    surname: trimmed.slice(spaceIndex + 1).trim() || trimmed,
  };
};

export const signInWithShopify = withContext(
  async (
    context,
    { shop, callbackURL }: { shop: string; callbackURL: string },
  ) => {
    const jar = await cookies();

    const shopifyDomain = shop
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    const normalizedShopifyDomain = shopifyDomain.includes(".myshopify.com")
      ? shopifyDomain
      : `${shopifyDomain}.myshopify.com`;

    jar.set("shopify_auth_shop", normalizedShopifyDomain, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const result = await resultify(
      async () =>
        await context.auth.signInWithOAuth2({
          body: {
            providerId: "shopify",
            // Server actions are invocable directly, so the caller controls
            // `callbackURL`. Re-validate here — Better Auth's originCheck does
            // not run on `auth.api.*` calls (no `ctx.request`).
            callbackURL: sanitizeRedirect(callbackURL, "/dashboard"),
            // `/onboarding/connect/shopify?shop=${encodeURIComponent(shop)}`
            // TODO: replace with /api/auth/shopify-proxy/authorize
            newUserCallbackURL: `/api/integrations/shopify/install?shop=${encodeURIComponent(shop)}`,
            // additionalData: {
            //   shop,
            // },
          },
        }),
    );

    if (!result.success) {
      return {
        success: false,
        error: new InvalidCredentialsError("Shopify sign-in failed", {
          cause: result.error,
        }),
      };
    }

    if (!result.data.url) {
      return {
        success: false,
        error: new InvalidCredentialsError("Shopify sign-in failed"),
      };
    }

    return { success: true, data: { url: result.data.url } };
  },
  "Authentication.signInWithShopify",
);

export const signInWithGoogle = withContext(
  async (context, { callbackURL }: { callbackURL: string }) => {
    const result = await resultify(
      async () =>
        await context.auth.signInSocial({
          body: {
            provider: "google",
            callbackURL: sanitizeRedirect(callbackURL, "/onboarding/connect"),
            newUserCallbackURL: "/complete-profile",
            disableRedirect: false,
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
    const result = await resultify(async () => {
      const response = await context.auth.signInEmail({
        body: {
          email,
          password,
        },
      });
      return response;
    });

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

    return { success: true, data: result.data.user };
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

  // better-auth expires both the session token and its cookie cache here, so
  // there is no cache of ours left to clear.
  if (!result.success) return result;

  // Redirect from the action itself. Sign-out is invoked from the settings page,
  // so without this Next re-renders that page's server components in the same
  // response — and they require the session we just destroyed, which threw
  // UnauthenticatedError on every sign-out. A redirect skips the re-render
  // (and its Stripe/database fan-out) entirely.
  redirect("/sign-in");
}, "Authentication.signOut");

export const getCurrentUser = withAuthentication(async (context) => {
  return {
    success: true,
    data: context.session.user,
  };
}, "Authentication.getCurrentUser");

export const resetPassword = withContext(
  async (context, { token, password }: { token: string; password: string }) => {
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

export const verifyEmail = withContext(async (_context, token: string) => {
  const callbackUrl = `${process.env.APP_HOST}/verify/success`;
  const redirectUrl = `${process.env.APP_HOST}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackUrl)}`;
  return {
    success: true,
    data: { redirectUrl },
  };
}, "Authentication.verifyEmail");

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

  if (result.error) throw result.error;
};
