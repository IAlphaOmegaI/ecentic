"use server";

import { render } from "@react-email/render";
import { Resend } from "resend";
import { VerifyEmail } from "@/emails/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

export type SendVerificationEmailParams = {
  to: string;
  verificationUrl: string;
};

/**
 * Sends the verification email. Do not await in the caller to avoid timing attacks.
 */
export const sendVerificationEmail = async ({
  to,
  verificationUrl,
}: SendVerificationEmailParams) => {
  const html = await render(
    VerifyEmail({
      verificationUrl,
      userEmail: to,
    }),
  );

  const result = await resend.emails.send({
    from: fromEmail,
    to,
    subject: "Verify your email address",
    html,
  });

  if (result.error) {
    throw result.error;
  }
};
