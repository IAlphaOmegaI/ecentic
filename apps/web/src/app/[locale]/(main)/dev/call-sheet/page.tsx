import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import { CallSheetClient } from "./_components/call-sheet-client";
import { CallSheetShell } from "./_components/shell";

export const metadata: Metadata = {
  title: "Call Sheet",
  robots: { index: false, follow: false },
};

export default async () => {
  // `proxy.ts` already gates `/dev/*` on the staff role; this is the second
  // lock. A redirect rather than a throw: there is no `error.tsx` under `app/`,
  // so a throw here would render the global error page instead of the
  // dashboard.
  const account = await Authentication.getCurrentUser(Environment.SERVER);

  if (!account.success || !isInternalStaff(account.data.role))
    redirect({ href: "/dashboard", locale: await getLocale() });

  return (
    <CallSheetShell>
      <CallSheetClient />
    </CallSheetShell>
  );
};
