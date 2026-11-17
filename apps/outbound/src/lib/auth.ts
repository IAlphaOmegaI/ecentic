import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/database";
import { isInternalStaff } from "@/server/database/validators";

export const auth = betterAuth({
  appName: "ecentic Outbound",
  baseURL: process.env.APP_HOST,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    cookiePrefix: "ecentic-outbound",
    database: { generateId: false },
  },
  session: {
    // Staff access is checked against the current user row on every request.
    cookieCache: { enabled: false },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },
  user: {
    modelName: "user",
    additionalFields: {
      surname: { type: "string", required: true, input: false },
      role: { type: "string", required: false, input: false },
      jobTitle: { type: "string", required: false, input: false },
      company: { type: "string", required: false, input: false },
      source: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError("FORBIDDEN", {
            message: "Staff accounts are managed by ecentic administrators.",
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [user] = await db
            .select({ role: schema.user.role })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId));
          if (!isInternalStaff(user?.role))
            throw new APIError("FORBIDDEN", {
              message: "This application is available to ecentic staff only.",
            });
          return { data: session };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
