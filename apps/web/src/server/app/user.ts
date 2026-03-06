"use server";

import { schema } from "../database";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.user);

export type Type = Document<typeof schema.user>;
