import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { cookies } from "next/headers";
import * as Authentication from "@/server/app/authentication";
import { db, schema } from "@/server/database";
import { verifyHmac } from "@/server/app/integration/shopify/hmac";

type ShopifyOnlineTokenResponse = {
  /** An API access token that can be used to access the shop's data. Your app should store the token somewhere to make authenticated requests for a shop's data. */
  access_token: string;
  /** The list of access scopes that were granted to your app and are associated with the access token. */
  scope: string;
  /** The number of seconds until the access token expires. */
  expires_in: number;
  /** The list of access scopes that were granted to the app and are available for this access token, given the user's permissions. */
  associated_user_scope: string;
  /** Information about the user who completed the OAuth authorization flow. The `email` field in this response appears regardless of the email verification status. If you're using emails as an identification source, then make sure that the `email_verified` field is also `true`. You can use the `id` field to uniquely identify a single user. */
  associated_user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    email_verified: boolean;
    account_owner: boolean;
    locale: string;
    collaborator: boolean;
  };
};

const parseName = (fullName: string): { name: string; surname?: string } => {
  const trimmedFullName = fullName.trim();
  // John Michael David => firstName = John Michael, surname = David
  const spaceIndex = trimmedFullName.lastIndexOf(" ");

  if (spaceIndex === -1) return { name: trimmedFullName };

  const firstName = trimmedFullName.slice(0, spaceIndex);
  const surname = trimmedFullName.slice(spaceIndex + 1).trim();

  return {
    name: firstName,
    surname: surname !== "" ? surname : undefined,
  };
};

const shopifyCallbackValidationPlugin = {
  id: "shopify-callback-validation",
  hooks: {
    before: [
      {
        matcher: (ctx) => {
          const shopifyCallbackUrl = `${process.env.APP_HOST}/api/auth/oauth2/callback/shopify`;

          return ctx.request?.url?.startsWith(shopifyCallbackUrl) ?? false;
        },
        handler: async (ctx) => {
          const url = ctx.request ? new URL(ctx.request.url) : undefined;

          if (!url) return;

          // const state = url.searchParams.get("state");
          // const nonce = jar.get("shopify_auth_nonce")?.value;

          // NOTE: no need to verify state since betterAuth verifies it by default
          // if (state !== nonce) {
          //   // TODO: redirect to `${process.env.APP_HOST}/sign-in?error=state_mismatch`
          //   throw new APIError("BAD_REQUEST", { message: "state_mismatch" });
          // }

          if (!verifyHmac(url.searchParams, process.env.SHOPIFY_API_SECRET)) {
            throw new APIError("BAD_REQUEST", { message: "hmac_mismatch" });
          }
        },
      },
    ],
  },
} satisfies BetterAuthPlugin;

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
  session: {
    // Lets the proxy authorize from a signed cookie instead of reading the
    // session table on every protected request. Unlike a hand-rolled cache this
    // one embeds the session's own `expiresAt` and is rejected once past it, and
    // sign-out expires it alongside the session token — so it can never outlive
    // the session it describes.
    cookieCache: {
      enabled: true,
      maxAge: 300,
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
        before: async ({ role, name: fullName, ...user }) => {
          const { name, surname } = parseName(fullName);

          return {
            data: {
              ...user,
              name,
              // biome-ignore lint/complexity/useLiteralKeys: index signature property
              surname: user["surname"] || surname,
              role: role ?? "user",
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // Without this Better Auth refuses `requestPasswordReset` outright
    // (`RESET_PASSWORD_DISABLED`), so the whole forgot-password flow hangs on
    // it. `url` already points at Better Auth's own `/reset-password/:token`
    // endpoint, which validates the token before handing off to our page.
    sendResetPassword: async ({ user, url }) => {
      void Authentication.sendResetPasswordEmail({
        to: user.email,
        resetUrl: url,
      });
    },
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
          authorizationUrlParams: {
            grant_options: "per-user",
          },
          //BUG: tokenUrl is required by better-auth for config validation even when getToken is provided
          tokenUrl: "https://shopify.myshopify.com/admin/oauth/access_token",
          getToken: async ({ code }) => {
            // TODO: the access_token should be an expiring offline token

            // TODO: add custom access token generation and
            // move `https://${shop}/admin/oauth/access_token` to getUserInfo since it is only needed to get the user info

            const jar = await cookies();
            const shop = jar.get("shopify_auth_shop")?.value;

            if (!shop) throw new Error("Missing Shopify shop domain");

            if (
              !process.env.SHOPIFY_API_KEY ||
              !process.env.SHOPIFY_API_SECRET
            ) {
              throw new Error("Shopify integration not configured");
            }

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
                  client_id: process.env.SHOPIFY_API_KEY,
                  client_secret: process.env.SHOPIFY_API_SECRET,
                  code,
                }).toString(),
              },
            );

            if (!response.ok) throw new Error("Shopify token exchange failed");

            const data = (await response.json()) as ShopifyOnlineTokenResponse;

            jar.delete("shopify_auth_shop");

            return {
              accessToken: data.access_token,
              accessTokenExpiresAt: new Date(
                Date.now() + data.expires_in * 1000,
              ),
              scopes: data.scope.split(","),
              raw: { shop, associated_user: data.associated_user },
            };
          },

          getUserInfo: async (tokens) => {
            // biome-ignore lint/complexity/useLiteralKeys: index signature property
            const shop = tokens.raw?.["shop"];
            // biome-ignore lint/complexity/useLiteralKeys: index signature property
            const associatedUser = tokens.raw?.["associated_user"] as
              | ShopifyOnlineTokenResponse["associated_user"]
              | undefined;

            if (!tokens.accessToken || !shop || !associatedUser) return null;

            return {
              id: associatedUser.id,
              email: associatedUser.email,
              name: `${associatedUser.first_name} ${associatedUser.last_name}`,
              emailVerified: associatedUser.email_verified,
              role: associatedUser.account_owner ? "owner" : "administrator",
            };
          },
        },
      ],
    }),
    shopifyCallbackValidationPlugin,
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // hooks: {
  //   before: [
  //     {
  //       matcher: (ctx) =>
  //         ctx.request?.url?.startsWith("/api/auth/oauth2/callback/shopify"),
  //       handler: async (ctx) => {
  //         console.log("validating hmac", ctx.request?.url);
  //       },
  //     },
  //   ],
});
