import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/server/database";

const parseArgs = (): { email: string; password: string; name: string } => {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);

    if (!match) continue;
    const [, key, value] = match;

    if (key !== undefined && value !== undefined) args.set(key, value);
  }

  const email = args.get("email");
  const password = args.get("password");
  const name = args.get("name") ?? "Administrator User";

  if (!email || !password) {
    console.error(
      "Usage: bun scripts/create-admin.ts --email=<email> --password=<password> [--name='Full Name']",
    );
    process.exit(1);
  }

  return { email, password, name };
};

const createAdmin = async () => {
  const { email, password, name } = parseArgs();

  const existing = await db
    .select({ id: schema.user.id, role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.user)
      .set({ role: "staff", emailVerified: true })
      .where(eq(schema.user.email, email));
    console.log(
      `User ${email} already existed — promoted to ecentic staff and verified.`,
    );
    return;
  }

  await auth.api.signUpEmail({
    body: {
      name,
      surname: name.includes(" ") ? name.split(" ").slice(1).join(" ") : name,
      email,
      password,
      role: "staff",
    },
  });

  await db
    .update(schema.user)
    .set({ role: "staff", emailVerified: true })
    .where(eq(schema.user.email, email));

  console.log(`Created ecentic staff account: ${email}`);
};

void createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Admin creation failed.");
    console.error(error);
    process.exit(1);
  });
