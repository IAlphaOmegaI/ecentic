"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Optimization from "./optimization";

export type * from "./optimization";

// Keep internal delegates out of Next.js action registration.
export const approveProductListing = async (
  ...parameters: ClientParameters<typeof Optimization.approveProductListing>
) => Optimization.approveProductListing(...parameters);

export const dismissSuggestion = async (
  ...parameters: ClientParameters<typeof Optimization.dismissSuggestion>
) => Optimization.dismissSuggestion(...parameters);

export const generateStructuredData = async (
  ...parameters: ClientParameters<typeof Optimization.generateStructuredData>
) => Optimization.generateStructuredData(...parameters);

export const optimizeStoreForAgents = async (
  ...parameters: ClientParameters<typeof Optimization.optimizeStoreForAgents>
) => Optimization.optimizeStoreForAgents(...parameters);

export const publishProductStructuredData = async (
  ...parameters: ClientParameters<
    typeof Optimization.publishProductStructuredData
  >
) => Optimization.publishProductStructuredData(...parameters);

export const reconsiderSuggestion = async (
  ...parameters: ClientParameters<typeof Optimization.reconsiderSuggestion>
) => Optimization.reconsiderSuggestion(...parameters);
