import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AuthFormSkeleton, AuthShell } from "../_components/auth-shell";
import { SignInForm } from "./_components/sign-in-form";

export default async function SignInPage() {
  const translate = await getTranslations("signIn");
  return (
    <AuthShell
      title={translate("title")}
      description={translate("description")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{translate("prompt.secondary")}</p>
          <Button
            variant="soft"
            color="emphasis"
            render={<Link href="/sign-up" />}
          >
            {translate("action.quaternary")}
          </Button>
        </div>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
