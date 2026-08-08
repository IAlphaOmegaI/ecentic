import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

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

// Outer frame shared by the store hub (`/dashboard`), the account settings
// screen (`/dashboard/settings`), and every per-store view
// (`/dashboard/[store]/*`). Each of those provides its own chrome inside this
// full-height flex container.
export default ({ children }: PropsWithChildren) => (
  <div className="flex h-screen overflow-hidden bg-background">{children}</div>
);
