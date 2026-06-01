import { render } from "@react-email/components";
import { Resend } from "resend";
import { VerifyEmail } from "@/public/templates/verify";

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
