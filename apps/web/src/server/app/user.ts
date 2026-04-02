"use server";

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
    data: { name: string; surname: string; email: string; role?: string },
  ) => {
    return update(Environment.SERVER, context.session.user.id, data);
  },
  "User.updateProfile",
);
