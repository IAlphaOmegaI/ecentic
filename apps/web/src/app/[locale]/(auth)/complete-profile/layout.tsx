import { unwrapResult } from "@zenncore/utils";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";

export default async ({ children }: { children: React.ReactNode }) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  if (user.company && user.jobTitle)
    redirect({ href: "/onboarding/connect", locale: await getLocale() });

  return children;
};
