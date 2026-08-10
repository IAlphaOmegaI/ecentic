"use server";

import { resultify } from "@zenncore/utils";
import { headers } from "next/headers";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.user);

export type Type = Document<typeof schema.user>;

export const updateProfile = withAuthentication(
  async (
    context,
    data: {
      name?: string;
      surname?: string;
      email?: string;
      jobTitle?: string;
      company?: string;
      source?: string;
    },
  ) => {
    return update(Environment.SERVER, context.session.user.id, data);
  },
  "User.updateProfile",
);

export const completeProfile = withAuthentication(
  async (
    context,
    data: {
      company: string;
      jobTitle: string;
      source?: string;
    },
  ) => {
    const result = await update(
      Environment.SERVER,
      context.session.user.id,
      data,
    );

    if (!result.success) return result;

    // The row is written, but `session.cookieCache` still holds a five-minute
    // old copy of the user — so `/onboarding/connect` would read the empty
    // `company`/`jobTitle` it was signed with and bounce straight back here.
    // Reading the session with `disableCookieCache` re-reads the row and
    // re-primes that cookie with the profile we just saved.
    //
    // Deliberately swallowed: the profile is already persisted, so a failed
    // refresh should cost the user a five-minute wait, not a failed save.
    await resultify(async () =>
      context.auth.getSession({
        headers: await headers(),
        query: { disableCookieCache: true },
      }),
    );

    return result;
  },
  "User.completeProfile",
);
