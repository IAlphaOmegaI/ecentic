"use server";

import { headers } from "next/headers";
import { withAuthentication } from "@/server/utils/authentication";
import { withContext } from "@/server/utils/context";

export const getCurrentUser = withAuthentication(
  async (context) => ({ success: true as const, data: context.session.user }),
  "Authentication.getCurrentUser",
);

export const signOut = withContext(async (context) => {
  await context.auth.signOut({ headers: await headers() });
  return { success: true as const };
}, "Authentication.signOut");
