import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  AccessDenied,
  SignInForm,
  SignInSkeleton,
} from "@/components/authentication";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import { AuthShell } from "./_components/auth-shell";

const SignInContent = async () => {
  const account = await Authentication.getCurrentUser(Environment.SERVER);
  if (account.success) {
    if (isInternalStaff(account.data.role))
      redirect({ href: "/", locale: await getLocale() });
    return <AccessDenied />;
  }
  return <SignInForm />;
};

export default () => (
  <AuthShell>
    <Suspense fallback={<SignInSkeleton />}>
      <SignInContent />
    </Suspense>
  </AuthShell>
);
