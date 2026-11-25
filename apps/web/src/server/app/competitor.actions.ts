"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Competitor from "./competitor";

export type * from "./competitor";

// Keep internal delegates out of Next.js action registration.
export const countForCurrentUser = async (
  ...parameters: ClientParameters<typeof Competitor.countForCurrentUser>
) => Competitor.countForCurrentUser(...parameters);

export const removeForUser = async (
  ...parameters: ClientParameters<typeof Competitor.removeForUser>
) => Competitor.removeForUser(...parameters);

export const streamDetection = async (
  ...parameters: ClientParameters<typeof Competitor.streamDetection>
) => Competitor.streamDetection(...parameters);

export const toggleSelection = async (
  ...parameters: ClientParameters<typeof Competitor.toggleSelection>
) => Competitor.toggleSelection(...parameters);
