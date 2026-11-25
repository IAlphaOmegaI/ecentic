import { expect, mock, test } from "bun:test";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { CLIENT_MESSAGES, pickMessages } from "@/i18n/client-messages";
import { locales } from "@/i18n/locales";
import type * as User from "@/server/app/user";

mock.module("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}));
mock.module("@zenncore/web/components/toast", () => ({
  useToastManager: () => ({ add: () => {} }),
}));
mock.module("@/components/language-switcher", () => ({
  LanguageSwitcher: () => null,
}));
mock.module(
  "@/app/[locale]/(main)/dashboard/settings/_components/settings/lifecycle-controls",
  () => ({ AccountDeletion: () => null }),
);
mock.module("@/server/app/authentication", () => ({
  changePassword: async () => ({ success: true }),
  signOut: async () => ({ success: true }),
}));
mock.module("@/server/app/user.actions", () => ({
  updateProfile: async () => ({ success: true }),
}));

const { AccountSection } = await import(
  "@/app/[locale]/(main)/dashboard/settings/_components/settings/account-section"
);
const user = {
  id: "merchant",
  name: "Yuri",
  surname: "Smith",
  email: "yuri@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  role: "staff",
  jobTitle: "Marketing Lead",
  company: "Acme Store",
  source: "Google Search",
} satisfies User.Type;

test("the real inferred form uses jobTitle and localized labels without changing its value", async () => {
  for (const locale of locales) {
    const messages = await Bun.file(
      new URL(`../../../../messages/${locale}.json`, import.meta.url),
    ).json();
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={pickMessages(messages, CLIENT_MESSAGES.dashboard)}
        timeZone="UTC"
      >
        <AccountSection user={user} roles={messages.signUp.roles} />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('name="jobTitle"');
    expect(markup).toContain('value="Marketing Lead"');
    expect(markup).toContain(messages.signUp.roles["Marketing Lead"]);
    expect(markup).not.toContain('name="role"');
    expect(markup).not.toContain('value="staff"');
  }
});

test("an absent job title uses the stable Other value, never the account role", async () => {
  const messages = await Bun.file(
    new URL("../../../../messages/es.json", import.meta.url),
  ).json();
  const markup = renderToStaticMarkup(
    <NextIntlClientProvider
      locale="es"
      messages={pickMessages(messages, CLIENT_MESSAGES.dashboard)}
      timeZone="UTC"
    >
      <AccountSection
        user={{ ...user, jobTitle: null }}
        roles={messages.signUp.roles}
      />
    </NextIntlClientProvider>,
  );

  expect(markup).toContain('name="jobTitle"');
  expect(markup).toContain('value="Other"');
  expect(markup).toContain(messages.signUp.roles.Other);
  expect(markup).not.toContain('value="staff"');
});
