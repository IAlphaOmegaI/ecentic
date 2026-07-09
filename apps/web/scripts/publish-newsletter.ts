import { eq } from "drizzle-orm";
import { render } from "react-email";
import { Resend } from "resend";
import { Newsletter } from "@/public/templates/newsletter";
import { db, schema } from "@/server/database";

const AUDIENCE = "General";
const SUBJECT =
  "Startup deals for YC and Techstars, plus EU market entry with EU Presence";
const NAME = "YC & Techstars deals + EU Presence partnership";

// Recipients that are not ecentic users but should receive the newsletter.
const EXTRAS = [{ email: "simona@foundergames.com", name: "Simona" }];

const resend = new Resend(process.env.RESEND_API_KEY);

const publish = async () => {
  const audiences = await resend.segments.list();
  if (audiences.error) throw audiences.error;

  const audience = audiences.data?.data.find(
    (candidate) => candidate.name === AUDIENCE,
  );
  if (!audience) throw new Error(`Audience "${AUDIENCE}" not found in Resend`);

  const contacts = await resend.contacts.list({ audienceId: audience.id });
  if (contacts.error) throw contacts.error;

  const existing = new Set(
    contacts.data?.data.map((contact) => contact.email) ?? [],
  );

  const users = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.emailVerified, true));

  const pending = [...users, ...EXTRAS].filter(
    (recipient) => !existing.has(recipient.email),
  );

  // Sequential on purpose — Resend caps requests at 10/s.
  const imports = [];
  for (const user of pending) {
    const [firstName, ...rest] = user.name.split(" ");
    const creation = await resend.contacts.create({
      audienceId: audience.id,
      email: user.email,
      firstName,
      lastName: rest.join(" ") || undefined,
      unsubscribed: false,
    });
    if (creation.error)
      console.error(`Failed to import ${user.email}:`, creation.error);
    imports.push(creation.error ? null : user.email);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const imported = imports.filter(Boolean);
  console.log(
    `Contacts: ${imported.length} imported, ${existing.size} already present`,
  );

  const broadcasts = await resend.broadcasts.list();
  if (broadcasts.error) throw broadcasts.error;

  const html = await render(Newsletter({}));

  const drafted = broadcasts.data?.data.find(
    (candidate) => candidate.name === NAME,
  );
  if (drafted) {
    const update = await resend.broadcasts.update(drafted.id, { html });
    if (update.error) throw update.error;
    console.log(`Broadcast ${drafted.id} updated with the latest template`);
    console.log(
      `Review and send it at https://resend.com/broadcasts/${drafted.id}`,
    );
    return;
  }

  const broadcast = await resend.broadcasts.create({
    audienceId: audience.id,
    from: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
    subject: SUBJECT,
    name: NAME,
    html,
  });
  if (broadcast.error) throw broadcast.error;

  console.log(`Broadcast draft created: ${broadcast.data?.id}`);
  console.log(
    `Review and send it at https://resend.com/broadcasts/${broadcast.data?.id}`,
  );
};

await publish();
process.exit(0);
