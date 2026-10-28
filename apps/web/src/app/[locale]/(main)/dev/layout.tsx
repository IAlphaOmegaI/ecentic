import { type PropsWithChildren, Suspense } from "react";
import { ClientMessages } from "@/i18n/client-messages";

// Staff tools read the request; their boundary lives here now that the root
// layout no longer wraps every route in one.
export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="dev">
    <Suspense>{children}</Suspense>
  </ClientMessages>
);
