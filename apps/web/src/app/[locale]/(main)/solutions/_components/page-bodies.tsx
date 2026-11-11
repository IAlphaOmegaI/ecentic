import { AgenciesAndPartnersBody } from "./page-bodies/agencies-and-partners";
import { BrandsBody } from "./page-bodies/brands";
import { EnterpriseBody } from "./page-bodies/enterprise";
import { RetailersAndMarketplacesBody } from "./page-bodies/retailers-and-marketplaces";

export const pageBodies = {
  brands: BrandsBody,
  "retailers-and-marketplaces": RetailersAndMarketplacesBody,
  enterprise: EnterpriseBody,
  "agencies-and-partners": AgenciesAndPartnersBody,
};
