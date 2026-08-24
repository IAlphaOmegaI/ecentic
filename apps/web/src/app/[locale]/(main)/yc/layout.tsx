import type { PropsWithChildren } from "react";
import { ClientMessages } from "@/i18n/client-messages";

export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="deals">{children}</ClientMessages>
);
