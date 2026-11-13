import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "../_components/auth-shell";
import { EntryChip } from "./_components/entry-chip";
import { SignUpForm } from "./_components/sign-up-form";

export default async function SignUpPage() {
  const translate = await getTranslations("signUp");
  const translateAuth = await getTranslations("authUX");
  return (
    <AuthShell
      title={translate("title")}
      description={translateAuth("signUp.description")}
      introduction={
        <Suspense>
          <EntryChip />
        </Suspense>
      }
      footer={
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{translate("prompt.secondary")}</p>
            <Button
              variant="soft"
              color="emphasis"
              render={<Link href="/sign-in" />}
            >
              {translate("action.secondary")}
            </Button>
          </div>
          <p>
            {translate.rich("prompt.terms", {
              termsLink: translate("prompt.termsLink"),
              privacyLink: translate("prompt.privacyLink"),
              terms: (children) => (
                <Link
                  href="/terms"
                  className="text-foreground underline decoration-accent-foreground underline-offset-4 hover:decoration-foreground"
                >
                  {children}
                </Link>
              ),
              privacy: (children) => (
                <Link
                  href="/privacy-policy"
                  className="text-foreground underline decoration-accent-foreground underline-offset-4 hover:decoration-foreground"
                >
                  {children}
                </Link>
              ),
            })}
          </p>
        </div>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
