"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as User from "./user";

export type * from "./user";

// Keep internal delegates out of Next.js action registration.
export const completeProfile = async (
  ...parameters: ClientParameters<typeof User.completeProfile>
) => User.completeProfile(...parameters);

export const updateProfile = async (
  ...parameters: ClientParameters<typeof User.updateProfile>
) => User.updateProfile(...parameters);
