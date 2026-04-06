import { unwrapResult } from "@zenncore/utils";
import { AuthProvider } from "@/components/auth-context";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";
import { OnboardingLayout } from "./_components/onboarding-layout";

export default async ({ children }: LayoutProps<"/onboarding">) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  return (
    <AuthProvider user={user}>
      <OnboardingLayout>{children}</OnboardingLayout>
    </AuthProvider>
  );
};
