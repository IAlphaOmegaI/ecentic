import { BellIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "../_components/auth-shell";

export default async function VerifyEmailPage() {
  const translate = await getTranslations("verifyEmail");
  return (
    <AuthShell
      title={translate("title")}
      description={translate("description")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{translate("prompt.differentEmail")}</p>
          <Button
            variant="soft"
            color="emphasis"
            render={<Link href="/sign-up" />}
          >
            {translate("action.signUpAgain")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-4">
        <BellIcon aria-hidden className="size-12 text-primary" />
        <p className="text-foreground leading-relaxed">
          {translate("states.pending.description")}
        </p>
        <p className="text-foreground-dimmed text-sm leading-relaxed">
          {translate("states.pending.expiry")}
        </p>
      </div>
    </AuthShell>
  );
}
