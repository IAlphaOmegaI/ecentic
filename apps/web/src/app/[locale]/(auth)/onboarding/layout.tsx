import { unwrapResult } from "@zenncore/utils";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthProvider } from "@/context/auth";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";
import { OnboardingLayout } from "./_components/onboarding-layout";

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default async ({ children }: OnboardingLayoutProps) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  if (!user.company || !user.jobTitle) redirect({ href: "/complete-profile", locale: await getLocale() });

  return (
    <AuthProvider user={user}>
      <OnboardingLayout>{children}</OnboardingLayout>
    </AuthProvider>
  );
};
