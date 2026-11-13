import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AuthFormSkeleton, AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./_components/reset-password-form";

export default async function ResetPasswordPage() {
  const translate = await getTranslations("resetPassword");
  const translateForgot = await getTranslations("forgotPassword");
  return (
    <AuthShell
      title={translate("title")}
      description={translate("description")}
      footer={
        <Button
          variant="soft"
          color="emphasis"
          render={<Link href="/sign-in" />}
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {translateForgot("action.secondary")}
        </Button>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
