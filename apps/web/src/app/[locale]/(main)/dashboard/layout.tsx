import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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

// Outer frame shared by the store hub (`/dashboard`), the account settings
// screen (`/dashboard/settings`), and every per-store view
// (`/dashboard/[store]/*`). Each of those provides its own chrome inside this
// rounded frame. Its border is the only outside seam for the connected chrome.
export default ({ children }: PropsWithChildren) => (
  <ClientMessages scope="dashboard">
    <NuqsAdapter>
      <div className="flex h-dvh min-h-0 overflow-hidden bg-emphasis font-normal">
        <div
          data-dashboard-frame
          className="border-(length:--dashboard-frame-border-width) isolate flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border-emphasis bg-emphasis [--dashboard-frame-border-width:3px] [--dashboard-workspace-inset:var(--dashboard-frame-border-width)]"
        >
          {children}
        </div>
      </div>
    </NuqsAdapter>
  </ClientMessages>
);
