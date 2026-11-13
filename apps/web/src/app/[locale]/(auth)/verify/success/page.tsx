import { ArrowRightIcon, CheckBadgeIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "../../_components/auth-shell";

export default async function VerifiedEmailPage() {
  const translate = await getTranslations("verifyEmail");
  return (
    <AuthShell
      title={translate("states.success.title")}
      description={translate("states.success.description")}
    >
      <div className="space-y-6 py-4">
        <CheckBadgeIcon aria-hidden className="size-12 text-success" />
        <p className="text-foreground-dimmed leading-relaxed">
          {translate("states.success.prompt.ready")}
        </p>
        <Button
          color="primary"
          className="w-full"
          render={<Link href="/onboarding/connect" />}
        >
          {translate("states.success.prompt.signIn")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      </div>
    </AuthShell>
  );
}
