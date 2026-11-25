"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as BrandSnapshot from "./brand-snapshot";

export type * from "./brand-snapshot";

// Keep internal delegates out of Next.js action registration.
export const isRunning = async (
  ...parameters: ClientParameters<typeof BrandSnapshot.isRunning>
) => BrandSnapshot.isRunning(...parameters);
