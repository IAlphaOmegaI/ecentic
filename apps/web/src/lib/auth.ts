import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { cookies } from "next/headers";
import * as Authentication from "@/server/app/authentication";
import { db, schema } from "@/server/database";

const parseName = (fullName: string): { name: string; surname: string } => {
  const trimmed = (fullName ?? "").trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) return { name: trimmed, surname: trimmed };
  return {
    name: trimmed.slice(0, spaceIndex),
    surname: trimmed.slice(spaceIndex + 1).trim() || trimmed,
  };
};

export const auth = betterAuth({
  baseURL: process.env.APP_HOST,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  user: {
    modelName: "user",
    additionalFields: {
      surname: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: false,
      },
      jobTitle: {
        type: "string",
        required: false,
      },
      company: {
        type: "string",
        required: false,
      },
      source: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const { name, surname } = parseName(user.name);
          return {
            data: {
              ...user,
              name,
              // biome-ignore lint/complexity/useLiteralKeys: index signature property
              surname: user["surname"] || surname,
              // biome-ignore lint/complexity/useLiteralKeys: index signature property
              role: user["role"] || "user",
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void Authentication.sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
      });
    },
  },
  plugins: [
    nextCookies(),
    genericOAuth({
      config: [
        {
          providerId: "shopify",
          clientId: process.env.SHOPIFY_API_KEY,
          clientSecret: process.env.SHOPIFY_API_SECRET,
          authorizationUrl: `${process.env.APP_HOST}/api/auth/shopify-proxy/authorize`,
          //BUG: tokenUrl is required by better-auth for config validation even when getToken is provided
          tokenUrl: "https://shopify.myshopify.com/admin/oauth/access_token",
          scopes: ["read_customers"],
          getToken: async ({ code }) => {
            const jar = await cookies();
            const shop = jar.get("shopify_auth_shop")?.value;

            console.log(shop);

            if (!shop) throw new Error("Missing Shopify shop domain");

            const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

            if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET)
              throw new Error("Shopify integration not configured");

            const response = await fetch(
              // make the access token expire (use ?expiring=1)
              `https://${shop}/admin/oauth/access_token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Accept: "application/json",
                },
                body: new URLSearchParams({
                  client_id: SHOPIFY_API_KEY,
                  client_secret: SHOPIFY_API_SECRET,
                  code,
                }).toString(),
              },
            );

            if (!response.ok) throw new Error("Shopify token exchange failed");

            const data = (await response.json()) as {
              access_token: string;
              scope: string;
            };

            return {
              accessToken: data.access_token,
              scopes: data.scope.split(","),
              raw: { shop },
            };
          },
          getUserInfo: async (tokens) => {
            // biome-ignore lint/complexity/useLiteralKeys: index signature property
            const shop = tokens.raw?.["shop"];

            if (!shop || !tokens.accessToken) return null;

            const response = await fetch(
              `https://${shop}/admin/api/2024-10/shop.json`,
              {
                headers: {
                  "X-Shopify-Access-Token": tokens.accessToken,
                  "Content-Type": "application/json",
                },
              },
            );

            if (!response.ok) return null;

            const data = (await response.json()) as {
              shop: {
                email: string;
                shop_owner: string;
                myshopify_domain: string;
              };
            };

            return {
              id: data.shop.myshopify_domain,
              email: data.shop.email,
              name: data.shop.shop_owner,
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});
