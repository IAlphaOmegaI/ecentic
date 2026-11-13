import type { Metadata } from "next";
import { type PropsWithChildren, Suspense } from "react";
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

// The onboarding and complete-profile layouts read the signed-in user before
// they render, so the group needs a boundary of its own above them. The root
// layout no longer wraps every route in one (it held back the first paint of
// the public pages).
export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="auth">
    <main className="h-screen min-h-screen">
      <Suspense>{children}</Suspense>
    </main>
  </ClientMessages>
);
