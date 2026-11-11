import { GoogleMerchantCenterBody } from "./page-bodies/google-merchant-center";
import { ProductFeedsBody } from "./page-bodies/product-feeds";
import { ShopifyBody } from "./page-bodies/shopify";
import { WoocommerceBody } from "./page-bodies/woocommerce";

export const pageBodies = {
  shopify: ShopifyBody,
  woocommerce: WoocommerceBody,
  googleMerchant: GoogleMerchantCenterBody,
  productFeeds: ProductFeedsBody,
};
