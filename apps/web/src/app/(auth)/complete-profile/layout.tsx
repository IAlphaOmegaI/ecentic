import { unwrapResult } from "@zenncore/utils";
import { redirect } from "next/navigation";
import * as Authentication from "@/server/app/authentication";
import { Environment } from "@/server/utils/environment";

export default async ({ children }: { children: React.ReactNode }) => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  if (user.company && user.jobTitle) {
    redirect("/onboarding/connect");
  }

  return <>{children}</>;
};
