import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
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
              surname: user.surname || surname,
              role: user.role || "user",
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
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});
