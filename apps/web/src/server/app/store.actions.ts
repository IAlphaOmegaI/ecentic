"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Store from "./store";

export type * from "./store";

// Keep internal delegates out of Next.js action registration.
export const syncProducts = async (
  ...parameters: ClientParameters<typeof Store.syncProducts>
) => Store.syncProducts(...parameters);
