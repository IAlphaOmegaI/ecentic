"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ChannelsWorkspace } from "../../channels/_components/workspace";
export const UcpShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucp.review");
  const channels = useTranslations("dashboard.channels");
  return (
    <ChannelsWorkspace
      subject="ucp"
      title={channels("checkout.title")}
      description={translate("description")}
    >
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </ChannelsWorkspace>
  );
};
export const UcpSectionSkeleton = () => (
  <div className="animate-pulse motion-reduce:animate-none" aria-busy="true">
    <div className="flex gap-6 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-4 w-28 rounded-sm bg-accent-foreground/20" />
      <div className="h-4 w-28 rounded-sm bg-accent-foreground/10" />
    </div>
    <div className="border-accent-foreground border-b px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex gap-3">
        <div className="size-6 rounded-sm bg-accent-foreground/20" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 max-w-full rounded-sm bg-accent-foreground/20" />
          <div className="h-4 w-2/3 rounded-sm bg-accent-foreground/10" />
        </div>
      </div>
      <div className="mt-6 h-4 w-24 rounded-sm bg-accent-foreground/10" />
      <div className="mt-2 flex max-w-3xl flex-col gap-2 sm:flex-row">
        <div className="h-10 flex-1 rounded-lg bg-accent-foreground/20" />
        <div className="h-10 w-full rounded-lg bg-accent-foreground/10 sm:w-36" />
      </div>
      <div className="mt-3 h-3 w-2/3 rounded-sm bg-accent-foreground/10" />
    </div>
    {["coverage", "advanced"].map((key) => (
      <div
        key={key}
        className="flex gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6"
      >
        <div className="size-5 rounded-sm bg-accent-foreground/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded-sm bg-accent-foreground/20" />
          <div className="h-4 w-2/3 rounded-sm bg-accent-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);
