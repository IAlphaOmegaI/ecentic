"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FeedbackLoading } from "@/components/feedback-state";
import { ChannelsWorkspace } from "../../channels/_components/workspace";
export const PlaygroundShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucpPlaygroundDashboard");

  return (
    <ChannelsWorkspace
      subject="ucpPlayground"
      title={translate("title")}
      description={translate("description")}
    >
      <div className="flex min-w-0 flex-1 flex-col bg-background-rich">
        {children}
      </div>
    </ChannelsWorkspace>
  );
};
export const PlaygroundSkeleton = () => {
  const translate = useTranslations("dashboard.ucpPlaygroundDashboard");

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-3xl">
        <FeedbackLoading
          title={translate("connect.action.connecting")}
          figure="channel-plug-hub"
          className="px-0 sm:px-0"
        />
        <div
          aria-hidden
          className="mx-auto flex w-full max-w-xl animate-pulse flex-col items-stretch gap-3 motion-reduce:animate-none sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded-sm bg-foreground/10" />
            <div className="h-10 w-full rounded-lg bg-foreground/5" />
          </div>
          <div className="h-10 rounded-lg bg-primary/10 sm:w-24" />
        </div>
      </div>
    </div>
  );
};
