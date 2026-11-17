import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/database";

/** Local operator command only. Password arrives on stdin, never in argv. */
const createAdmin = async () => {
  const argumentsByName = new Map(
    process.argv.slice(2).map((argument) => {
      const separator = argument.indexOf("=");
      return [argument.slice(0, separator), argument.slice(separator + 1)];
    }),
  );
  const account = z
    .object({
      email: z.email().transform((value) => value.toLowerCase()),
      password: z.string().min(12).max(128),
      name: z.string().trim().min(1),
      surname: z.string().trim().min(1),
    })
    .parse({
      email: argumentsByName.get("--email"),
      password: (await Bun.stdin.text()).trimEnd(),
      name: argumentsByName.get("--name") ?? "Outbound",
      surname: argumentsByName.get("--surname") ?? "Administrator",
    });
  const password = await hashPassword(account.password);

  await db.transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, account.email))
      .limit(1);
    if (existing.length > 0)
      throw new Error("This email already exists; no account was changed.");

    const [user] = await transaction
      .insert(schema.user)
      .values({
        email: account.email,
        name: account.name,
        surname: account.surname,
        role: "staff",
        emailVerified: true,
      })
      .returning({ id: schema.user.id });
    if (!user) throw new Error("Staff account creation failed.");

    await transaction.insert(schema.account).values({
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      issuer: "local:credential",
      password,
    });
  });
  console.log(`Created staff account: ${account.email}`);
};

void createAdmin()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Account creation failed.",
    );
    process.exit(1);
  });
