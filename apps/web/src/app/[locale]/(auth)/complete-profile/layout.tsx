import { unwrapResult } from "@zenncore/utils";
import { getLocale } from "next-intl/server";
import { type PropsWithChildren, Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";

const CompleteProfileAccess = async ({ children }: PropsWithChildren) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  if (user.company && user.jobTitle)
    redirect({ href: "/onboarding/connect", locale: await getLocale() });

  return children;
};

export default ({ children }: PropsWithChildren) => (
  <Suspense>
    <CompleteProfileAccess>{children}</CompleteProfileAccess>
  </Suspense>
);
