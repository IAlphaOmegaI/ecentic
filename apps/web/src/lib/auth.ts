import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as Authentication from "@/server/app/authentication";
import { db, schema } from "@/server/database";

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
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // sendResetPassword: async (context) => {
    //   await unwrapResult(
    //     Authentication.handlePasswordReset({
    //       id: context.user.id,
    //       url: context.url,
    //     }),
    //   );
    // },
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

  plugins: [nextCookies()],
});
