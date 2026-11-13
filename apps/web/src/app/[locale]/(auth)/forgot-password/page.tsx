import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const translate = await getTranslations("forgotPassword");
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
          {translate("action.secondary")}
        </Button>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
