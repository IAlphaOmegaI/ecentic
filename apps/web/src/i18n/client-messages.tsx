import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

/**
 * Per-route-scope client message payloads.
 *
 * `NextIntlClientProvider` serializes whatever `messages` it is given into the
 * RSC payload of every page under it. Handing it the whole catalog put 242KB of
 * JSON — half the homepage's transferred HTML — into a page whose client
 * components read four namespaces. That is what made the homepage 484KB of
 * markup around 7.6KB of text.
 *
 * So each scope declares what its subtree actually reads. Nested providers
 * *replace* rather than merge (`use-intl` resolves `messages` as
 * `messages === undefined ? outer : messages`), so every list here is complete
 * on its own — never a delta on the one above it.
 *
 * ## Adding a route
 *
 * A page under `(main)` inherits `marketing`. If its client components read a
 * namespace outside that list, give the route its own `layout.tsx` rendering
 * `<ClientMessages scope="…">` and add the scope here. `client-messages.test.ts`
 * recomputes every scope from the import graph and fails with the exact missing
 * path, so this cannot silently drift — a missed namespace is a red test, not a
 * broken page.
 */

/** Chrome on every marketing page: navbar, language switcher, sign-in link. */
const CHROME = ["general", "nav", "signIn"] as const;

/** Chrome plus the shared section grid every content page's layout draws. */
const MARKETING = [...CHROME, "dashboard.grid"] as const;

export const CLIENT_MESSAGES = {
  /** Root layout: only the cookie banner renders above the route groups. */
  root: ["cookieConsent"],
  marketing: MARKETING,
  home: [...MARKETING, "home"],
  features: [...MARKETING, "productListings"],
  platforms: [...MARKETING, "shopify", "woocommerce"],
  pricing: [...MARKETING, "pricing"],
  ucpValidator: [...MARKETING, "ucpValidator"],
  webmcpScanner: [...MARKETING, "webmcpScanner"],
  // The playground client reads its catalog through `useMessages()`, which
  // walks the object directly — the whole `dashboard` sub-tree has to be there.
  ucpPlayground: [...MARKETING, "dashboard"],
  /** Partner deal pages (`/yc`, `/techstars`) share one redemption form. */
  deals: [...MARKETING, "dealRedemption"],
  dev: [...MARKETING, "dashboard"],
  dashboard: [
    ...MARKETING,
    "dashboard",
    "onboarding",
    "pricing",
    "ucpValidator",
    "webmcpScanner",
  ],
  auth: [
    ...CHROME,
    "authChrome",
    "compareTool",
    "completeProfile",
    "forgotPassword",
    "onboarding",
    "resetPassword",
    "signUp",
    "verifyEmail",
  ],
} as const satisfies Record<string, readonly string[]>;

export type MessageScope = keyof typeof CLIENT_MESSAGES;

type Tree = Record<string, unknown>;

const read = (messages: Tree, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Tree | undefined)?.[key],
      messages,
    );

const write = (target: Tree, path: string, value: unknown) => {
  const keys = path.split(".");
  const leaf = keys[keys.length - 1] ?? path;
  const parent = keys.slice(0, -1).reduce<Tree>((node, key) => {
    node[key] ??= {};
    return node[key] as Tree;
  }, target);
  parent[leaf] = value;
};

/**
 * The declared paths with any that a shorter sibling already covers dropped —
 * `["dashboard", "dashboard.grid"]` is just `["dashboard"]`. Without this,
 * writing the deeper path second would overwrite the sub-tree written first.
 */
const canonical = (paths: readonly string[]) =>
  paths.filter(
    (path) =>
      !paths.some((other) => other !== path && path.startsWith(`${other}.`)),
  );

export const pickMessages = <T extends Tree>(
  messages: T,
  paths: readonly string[],
): T => {
  const picked: Tree = {};

  for (const path of canonical(paths)) {
    const value = read(messages, path);
    // A declared-but-absent path is not fatal here: next-intl reports the
    // missing message at the call site, which names the key. Throwing would
    // turn a copy deletion into a blank page.
    if (value !== undefined) write(picked, path, value);
  }

  // The catalog is typed as the full `AppConfig.Messages` shape, and a subset
  // is by definition not that shape. The cast is the boundary: the guarantee
  // that a scope's subset covers what its subtree reads is enforced by
  // `client-messages.test.ts`, not by the type.
  return picked as T;
};

/**
 * Provides one scope's messages to the client components below it. Server
 * component: `getMessages()` reads the request's catalog, and only the picked
 * subset crosses into the payload.
 */
export const ClientMessages = async ({
  scope,
  children,
}: PropsWithChildren<{ scope: MessageScope }>) => {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, CLIENT_MESSAGES[scope])}
    >
      {children}
    </NextIntlClientProvider>
  );
};
