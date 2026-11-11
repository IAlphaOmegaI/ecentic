import { unwrapResult } from "@zenncore/utils";
import { getLocale } from "next-intl/server";
import { type PropsWithChildren, Suspense } from "react";
import { AuthProvider } from "@/context/auth";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";
import { OnboardingLayout } from "./_components/onboarding-layout";

const AuthenticatedOnboarding = async ({ children }: PropsWithChildren) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  if (!user.company || !user.jobTitle)
    redirect({ href: "/complete-profile", locale: await getLocale() });

  return (
    <AuthProvider user={user}>
      <OnboardingLayout>{children}</OnboardingLayout>
    </AuthProvider>
  );
};

export default ({ children }: PropsWithChildren) => (
  <Suspense>
    <AuthenticatedOnboarding>{children}</AuthenticatedOnboarding>
  </Suspense>
);
