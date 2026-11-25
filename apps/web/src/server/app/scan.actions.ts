"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Scan from "./scan";

export type * from "./scan";

// Keep internal delegates out of Next.js action registration.
export const getInFlight = async (
  ...parameters: ClientParameters<typeof Scan.getInFlight>
) => Scan.getInFlight(...parameters);

export const getProgress = async (
  ...parameters: ClientParameters<typeof Scan.getProgress>
) => Scan.getProgress(...parameters);
