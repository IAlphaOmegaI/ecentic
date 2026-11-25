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
import * as OAuth from "./oauth";
import { LoopLifecycleError } from "./types";

const storeSchema = z.object({
  store: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
});
const secretSchema = z
  .string()
  .trim()
  .min(8)
  .max(16_384)
  .refine((value) => !/[\r\n]/.test(value));
const connectSchema = storeSchema.extend({
  apiKey: secretSchema,
  webhookSecret: secretSchema,
});
const revalidate = (store: string) => {
  revalidatePath("/dashboard/settings");
  revalidatePath(`/dashboard/${store}`);
  revalidatePath(`/dashboard/${store}/products`);
  revalidatePath(`/dashboard/${store}/optimize`);
};
export const getStatus = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(() =>
      Model.getStatus({
        ...storeSchema.parse(input),
        user: context.session.user.id,
      }),
    ),
  "Loop.getStatus",
);
export const connect = withAuthentication(
  async (
    context,
    input: { store: string; apiKey: string; webhookSecret: string },
  ) =>
    resultify(async () => {
      const parsed = connectSchema.parse(input);
      await OAuth.connectApiKey({ ...parsed, user: context.session.user.id });
      after(() => Jobs.drain({ store: parsed.store, limit: 5 }));
      revalidate(parsed.store);
      return { connected: true };
    }),
  "Loop.connect",
);
export const sync = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(async () => {
      const parsed = storeSchema.parse(input);
      await Model.requestSync({ ...parsed, user: context.session.user.id });
      after(() => Jobs.drain({ store: parsed.store, limit: 5 }));
      revalidate(parsed.store);
      return { queued: true };
    }),
  "Loop.sync",
);
export const disconnect = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(async () => {
      const parsed = storeSchema.parse(input);
      const session = await context.auth.getSession({
        headers: await headers(),
        query: { disableCookieCache: true },
      });
      if (!session || !hasFreshSession(session.session.createdAt))
        throw new LoopLifecycleError("reauthenticate");
      const connection = await Model.disconnect({
        ...parsed,
        user: session.user.id,
      });
      if (connection) await Jobs.deleteRemoteWebhooks(connection);
      revalidate(parsed.store);
      return { disconnected: true };
    }),
  "Loop.disconnect",
);
export const deleteData = withAuthentication(
  async (context, input: { store: string }) =>
    resultify(async () => {
      const parsed = storeSchema.parse(input);
      const session = await context.auth.getSession({
        headers: await headers(),
        query: { disableCookieCache: true },
      });
      if (!session || !hasFreshSession(session.session.createdAt))
        throw new LoopLifecycleError("reauthenticate");
      const connection = await Model.disconnect({
        ...parsed,
        user: session.user.id,
      });
      await Model.purge(parsed);
      if (connection) await Jobs.deleteRemoteWebhooks(connection);
      revalidate(parsed.store);
      return { deleted: true };
    }),
  "Loop.deleteData",
);
export const rotateWebhookSecret = withAuthentication(
  async (context, input: { store: string; webhookSecret: string }) =>
    resultify(async () => {
      const parsed = storeSchema
        .extend({ webhookSecret: secretSchema })
        .parse(input);
      await Model.rotateSecret({ ...parsed, user: context.session.user.id });
      await Model.requestSync({
        store: parsed.store,
        user: context.session.user.id,
      });
      after(() => Jobs.drain({ store: parsed.store, limit: 5 }));
      revalidate(parsed.store);
      return { saved: true };
    }),
  "Loop.rotateWebhookSecret",
);
