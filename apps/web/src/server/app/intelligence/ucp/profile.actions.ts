"use server";

import type { ClientParameters } from "@/server/utils/environment";
import * as Profile from "./profile";

export type * from "./profile";

// Keep internal delegates out of Next.js action registration.
export const generateAllProductStructuredData = async (
  ...parameters: ClientParameters<
    typeof Profile.generateAllProductStructuredData
  >
) => Profile.generateAllProductStructuredData(...parameters);

export const generateJson = async (
  ...parameters: ClientParameters<typeof Profile.generateJson>
) => Profile.generateJson(...parameters);

export const generateProductStructuredData = async (
  ...parameters: ClientParameters<typeof Profile.generateProductStructuredData>
) => Profile.generateProductStructuredData(...parameters);

export const publishProductsToShopify = async (
  ...parameters: ClientParameters<typeof Profile.publishProductsToShopify>
) => Profile.publishProductsToShopify(...parameters);

export const publishProfileToShopify = async (
  ...parameters: ClientParameters<typeof Profile.publishProfileToShopify>
) => Profile.publishProfileToShopify(...parameters);

export const saveProfile = async (
  ...parameters: ClientParameters<typeof Profile.saveProfile>
) => Profile.saveProfile(...parameters);
