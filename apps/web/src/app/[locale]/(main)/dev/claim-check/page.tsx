import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import { ClaimCheckDemo } from "./_components/demo-client";
import { DemoShell } from "./_components/shell";

export const metadata: Metadata = {
  title: "Claim check demo",
  robots: { index: false, follow: false },
};

// The demo action posts against this segment and waits for the whole check —
// live page, ~6 model calls and the cited pages — well past the default window.
export const maxDuration = 300;

export default async () => {
  // `proxy.ts` already gates `/dev/*` on the staff role; this is the second
  // lock. A redirect rather than a throw: there is no `error.tsx` under `app/`.
  const account = await Authentication.getCurrentUser(Environment.SERVER);

  if (!account.success || !isInternalStaff(account.data.role))
    redirect({ href: "/dashboard", locale: await getLocale() });

  return (
    <DemoShell>
      <ClaimCheckDemo />
    </DemoShell>
  );
};
