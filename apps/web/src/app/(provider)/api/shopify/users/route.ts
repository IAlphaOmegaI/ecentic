// app/api/shopify/products/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const SHOP = "uryftr-d0.myshopify.com";
  const ACCESS_TOKEN = "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";

  const query = `
      query {
        shop {
          name
          currencyCode
          checkoutApiSupported
          taxesIncluded
          accountOwner {id}
          resourceLimits {
            maxProductVariants
          }
        }
      }
    `;

  const response = await fetch(
    `https://${SHOP}/admin/api/2026-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    },
  );

  const data = await response.json();
  return NextResponse.json(data);
}
