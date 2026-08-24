import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { ClientMessages } from "@/i18n/client-messages";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="auth">
    <main className="h-screen min-h-screen">{children}</main>
  </ClientMessages>
);
