"use server";

import { resultify } from "@zenncore/utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { hasFreshSession } from "@/server/utils/account-lifecycle";
import { withAuthentication } from "@/server/utils/authentication";
import * as Jobs from "./jobs";
import * as Model from "./model";
import { RechargeLifecycleError } from "./types";

const inputSchema = z.object({
  store: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const getStatus = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(() =>
      Model.getStatus({
        ...inputSchema.parse(input),
        user: context.session.user.id,
      }),
    ),
  "Recharge.getStatus",
);

export const getMetrics = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(() =>
      Model.getMetrics({
        ...inputSchema.parse(input),
        user: context.session.user.id,
      }),
    ),
  "Recharge.getMetrics",
);

export const sync = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(async () => {
      const parsed = inputSchema.parse(input);
      await Model.requestSync({ ...parsed, user: context.session.user.id });
      after(() => Jobs.drain({ limit: 10 }));
      revalidatePath("/dashboard/settings");
      revalidatePath(`/dashboard/${parsed.store}`);
      return { queued: true };
    }),
  "Recharge.sync",
);

export const disconnect = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(async () => {
      const parsed = inputSchema.parse(input);
      const session = await context.auth.getSession({
        headers: await headers(),
        query: { disableCookieCache: true },
      });
      if (!session || !hasFreshSession(session.session.createdAt))
        throw new RechargeLifecycleError("reauthenticate");
      await Model.disconnect({ ...parsed, user: session.user.id });
      revalidatePath("/dashboard/settings");
      revalidatePath(`/dashboard/${parsed.store}`);
      return { disconnected: true };
    }),
  "Recharge.disconnect",
);
