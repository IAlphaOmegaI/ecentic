"use server";

import { resultify } from "@zenncore/utils";
import { getCookies } from "better-auth/cookies";
import { and, eq, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localizePath } from "@/i18n/locale";
import { defaultLocale, locales } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import { ENTRY_COOKIE } from "@/lib/redirect";
import { db, schema } from "../database";
import {
  hasFreshSession,
  type LifecycleBlocker,
  storeDisconnectBlocker,
} from "../utils/account-lifecycle";
import { withAuthentication } from "../utils/authentication";

const blocked = (reason: LifecycleBlocker) => ({
  status: "blocked" as const,
  reason,
});

export const disconnectStore = withAuthentication(
  async (context, input: { store: string }) => {
    const parsed = z
      .object({
        store: z
          .string()
          .min(1)
          .max(200)
          .regex(/^[A-Za-z0-9_-]+$/),
      })
      .safeParse(input);
    if (!parsed.success)
      return { success: true as const, data: blocked("notFound") };
    const identifier = parsed.data.store;
    const session = await context.auth.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    });
    if (!session || !hasFreshSession(session.session.createdAt))
      return { success: true as const, data: blocked("reauthenticate") };

    return resultify(() =>
      db.transaction(async (transaction) => {
        // Lock before inspecting dependent grants so the local changes are atomic.
        // A separately authorized reconnect can restore credentials afterward.
        const [store] = await transaction
          .select()
          .from(schema.store)
          .where(
            and(
              eq(schema.store.id, identifier),
              eq(schema.store.userId, session.user.id),
            ),
          )
          .for("update");
        const google = store
          ? await transaction
              .select({ id: schema.googleMerchantAccount.id })
              .from(schema.googleMerchantAccount)
              .where(eq(schema.googleMerchantAccount.storeId, identifier))
              .limit(1)
          : [];
        const reason = storeDisconnectBlocker({
          owner: store?.userId,
          actor: session.user.id,
          shopifyUsageLine: store?.shopifyUsageLineId,
          googleConnected: google.length > 0,
        });
        if (reason) return blocked(reason);

        await transaction
          .delete(schema.store_account)
          .where(eq(schema.store_account.storeId, identifier));
        await transaction
          .update(schema.store)
          .set({
            status: "disconnected",
            trackerApiKey: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.store.id, identifier),
              eq(schema.store.userId, session.user.id),
            ),
          );
        context.span.addBreadcrumb({
          category: "store.disconnected",
          data: { "store.id": identifier },
        });
        return { status: "disconnected" as const };
      }),
    );
  },
  "AccountLifecycle.disconnectStore",
);

export const deleteAccount = withAuthentication(
  async (context, input: { email: string; locale?: string }) => {
    const parsed = z
      .object({
        email: z.email().max(320),
        locale: z.enum(locales).default(defaultLocale),
      })
      .safeParse(input);
    if (!parsed.success)
      return { success: true as const, data: blocked("confirmation") };
    const { email, locale } = parsed.data;
    const requestHeaders = await headers();
    const session = await context.auth.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
    if (!session || !hasFreshSession(session.session.createdAt))
      return { success: true as const, data: blocked("reauthenticate") };
    if (email.trim().toLowerCase() !== session.user.email.toLowerCase())
      return { success: true as const, data: blocked("confirmation") };

    const deletion = await resultify(() =>
      db.transaction(async (transaction) => {
        const identifier = session.user.id;
        const [user] = await transaction
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.id, identifier))
          .for("update");
        if (!user) return blocked("notFound");
        const stores = await transaction
          .select({
            id: schema.store.id,
            usage: schema.store.shopifyUsageLineId,
          })
          .from(schema.store)
          .where(eq(schema.store.userId, identifier))
          .for("update");
        const subscriptions = await transaction
          .select()
          .from(schema.subscription)
          .where(eq(schema.subscription.userId, identifier))
          .for("update");
        const [periods, conversions] = await Promise.all([
          transaction
            .select({ id: schema.feePeriod.id })
            .from(schema.feePeriod)
            .where(eq(schema.feePeriod.userId, identifier))
            .limit(1),
          transaction
            .select({ id: schema.attributedConversion.id })
            .from(schema.attributedConversion)
            .where(eq(schema.attributedConversion.userId, identifier))
            .limit(1),
        ]);
        // Financial history requires the documented assisted deletion process.
        // Never cascade invoice/fee records or orphan a live billing agreement.
        if (
          subscriptions.length > 0 ||
          periods.length > 0 ||
          conversions.length > 0 ||
          stores.some((store) => store.usage)
        )
          return blocked("billingRecords");

        if (stores.length > 0) {
          const identifiers = stores.map((store) => store.id);
          const [credentials, google, orders] = await Promise.all([
            transaction
              .select({ id: schema.store_account.id })
              .from(schema.store_account)
              .where(inArray(schema.store_account.storeId, identifiers))
              .limit(1),
            transaction
              .select({ id: schema.googleMerchantAccount.id })
              .from(schema.googleMerchantAccount)
              .where(inArray(schema.googleMerchantAccount.storeId, identifiers))
              .limit(1),
            transaction
              .select({ id: schema.ucpOrder.id })
              .from(schema.ucpOrder)
              .where(inArray(schema.ucpOrder.storeId, identifiers))
              .limit(1),
          ]);
          if (orders.length > 0) return blocked("billingRecords");
          if (credentials.length > 0 || google.length > 0)
            return blocked("storeConnections");
        }
        // All account-owned data uses ON DELETE CASCADE. This transaction owns
        // the user/store locks so new dependent data cannot race the final check.
        await transaction
          .delete(schema.verification)
          .where(eq(schema.verification.identifier, session.user.email));
        await transaction
          .delete(schema.user)
          .where(eq(schema.user.id, identifier));
        return { status: "deleted" as const };
      }),
    );
    if (!deletion.success || deletion.data.status !== "deleted")
      return deletion;

    // Expire Better Auth's token and cookie cache after the DB transaction.
    await resultify(() => context.auth.signOut({ headers: requestHeaders }));
    const jar = await cookies();
    // The account deletion already committed. Even if the sign-out endpoint
    // cannot reach the database, expire its cookies and complete navigation.
    for (const cookie of Object.values(getCookies(auth.options))) {
      const attributes = {
        path: cookie.attributes.path,
        domain: cookie.attributes.domain,
        httpOnly: cookie.attributes.httpOnly,
        secure: cookie.attributes.secure,
        sameSite: "lax" as const,
        maxAge: 0,
      };
      jar.set(cookie.name, "", attributes);
      for (const chunk of jar
        .getAll()
        .filter((entry) => entry.name.startsWith(`${cookie.name}.`)))
        jar.set(chunk.name, "", attributes);
    }
    jar.delete(ENTRY_COOKIE);
    redirect(localizePath("/sign-in", locale));
  },
  "AccountLifecycle.deleteAccount",
);
