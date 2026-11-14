"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ChannelsWorkspace } from "../../channels/_components/workspace";
export const PlaygroundShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucpPlaygroundDashboard");

  return (
    <ChannelsWorkspace
      subject="ucpPlayground"
      title={translate("title")}
      description={translate("description")}
    >
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </ChannelsWorkspace>
  );
};
export const PlaygroundSkeleton = () => (
  <div
    aria-hidden
    className="grid animate-pulse motion-reduce:animate-none lg:grid-cols-3"
  >
    <div className="space-y-3 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
      <div className="h-6 w-40 max-w-full rounded-sm bg-foreground/10" />
      <div className="h-10 w-full rounded-sm bg-foreground/5" />
    </div>
    <div className="space-y-3 px-4 py-6 sm:px-6 lg:col-span-2">
      <div className="h-4 w-28 rounded-sm bg-foreground/10" />
      <div className="h-10 w-full rounded-lg bg-foreground/5" />
      <div className="h-10 w-40 rounded-lg bg-foreground/10" />
    </div>
  </div>
);
