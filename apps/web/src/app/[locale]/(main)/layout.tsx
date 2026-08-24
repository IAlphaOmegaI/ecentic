import type { PropsWithChildren } from "react";
import { ClientMessages } from "@/i18n/client-messages";

/**
 * Baseline client messages for every marketing route: navbar, language
 * switcher, sign-in link, and the shared section grid. Routes whose client
 * components read more than that provide their own scope in a nested layout.
 */
export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="marketing">{children}</ClientMessages>
);
