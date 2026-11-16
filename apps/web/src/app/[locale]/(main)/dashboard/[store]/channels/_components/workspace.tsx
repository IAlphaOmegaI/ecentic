"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { Crosshair } from "../../../_components/grid";
import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const ChannelsWorkspace = ({
  title,
  description,
  subject = "channels",
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  subject: ComponentProps<typeof DashboardHeaderFigure>["subject"];
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn("flex min-h-full min-w-0 flex-col bg-background", className)}
  >
    <header className="relative flex min-w-0 items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <DashboardHeaderFigure subject={subject} />
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-3 break-words font-heading font-semibold text-3xl text-foreground-rich">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
            {description}
          </p>
        )}
      </div>
      <Crosshair className="bottom-0 left-1 translate-y-1/2" />
      <Crosshair className="right-1 bottom-0 translate-y-1/2" />
    </header>
    {children}
  </div>
);

export const ChannelSection = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "min-w-0 border-accent-foreground border-b bg-background-rich",
      className,
    )}
  >
    {children}
  </section>
);

export const ChannelsSkeleton = () => (
  <div className="animate-pulse motion-reduce:animate-none" aria-busy="true">
    <div className="grid border-accent-foreground border-b sm:grid-cols-2">
      {["source", "google"].map((key, index) => (
        <div
          key={key}
          className={cn(
            "min-h-72 min-w-0 px-4 py-6 sm:px-6",
            index === 1 &&
              "border-accent-foreground border-t sm:border-t-0 sm:border-l",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-accent-foreground/30" />
            <div className="h-5 w-40 rounded-sm bg-accent-foreground/30" />
          </div>
          <div className="mt-3 h-4 w-3/4 rounded-sm bg-accent-foreground/20" />
          <div className="mt-6 h-5 w-2/3 rounded-sm bg-accent-foreground/20" />
          <div className="mt-3 h-4 w-1/2 rounded-sm bg-accent-foreground/20" />
          <div className="mt-6 flex justify-between gap-4">
            <div className="h-5 w-24 rounded-sm bg-accent-foreground/20" />
            <div className="h-9 w-36 rounded-lg bg-accent-foreground/20" />
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="size-10 rounded-lg bg-accent-foreground/30" />
      <div className="min-w-0 flex-1">
        <div className="h-5 w-32 rounded-sm bg-accent-foreground/30" />
        <div className="mt-3 h-4 w-3/4 rounded-sm bg-accent-foreground/20" />
      </div>
      <div className="h-9 w-36 rounded-lg bg-accent-foreground/20" />
    </div>
  </div>
);

export const ChannelsHomeShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.channels");
  return (
    <ChannelsWorkspace
      title={translate("title")}
      description={translate("description")}
      subject="channels"
    >
      {children}
    </ChannelsWorkspace>
  );
};
