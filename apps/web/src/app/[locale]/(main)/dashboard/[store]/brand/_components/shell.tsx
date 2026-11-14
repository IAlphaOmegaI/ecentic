"use client";

import { AlertCircleIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState, useTransition } from "react";
import { AnalysisText } from "@/components/analysis-text";
import { useRouter } from "@/i18n/navigation";
import { Crosshair, Slot } from "../../../_components/grid";

import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const BrandShell = ({
  actions,
  content,
}: {
  actions?: ReactNode;
  content: ReactNode;
}) => {
  const translate = useTranslations("dashboard.brand.design");

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-5 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <DashboardHeaderFigure subject="brand" />
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {translate("title")}
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm leading-6">
              {translate("description")}
            </p>
          </div>
        </div>
        <Slot>{actions}</Slot>
      </header>
      <div className="relative min-w-0 border-accent-foreground border-y">
        <Crosshair className="top-0 left-0 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        <Slot>{content}</Slot>
      </div>
    </div>
  );
};

export const BrandMethod = () => {
  const translate = useTranslations("dashboard.brand.design");

  return (
    <Popover>
      <PopoverTrigger className="min-h-8 rounded-lg border-transparent bg-transparent px-2 py-1 font-medium text-foreground-dimmed text-xs hover:text-foreground-rich">
        {translate("method.action.primary")}
      </PopoverTrigger>
      <PopoverPositioner align="end" className="z-50">
        <PopoverPopup className="w-80 max-w-(--available-width) bg-background-rich px-4 py-4">
          <PopoverTitle className="font-semibold text-sm">
            {translate("method.action.primary")}
          </PopoverTitle>
          <PopoverDescription className="mt-2 text-sm leading-6">
            {translate("scope")}
          </PopoverDescription>
        </PopoverPopup>
      </PopoverPositioner>
    </Popover>
  );
};

export const BrandTabs = ({
  plan,
  answers,
  access,
}: {
  plan: ReactNode;
  answers: ReactNode;
  access: ReactNode;
}) => {
  const translate = useTranslations("dashboard.brand.design.tabs");

  return (
    <Tabs defaultValue="plan" className="min-w-0">
      <div className="relative border-accent-foreground border-y px-4 py-4 sm:px-6">
        <Crosshair className="top-0 left-0 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        <TabsList className="h-auto max-w-full">
          <Tab
            value="plan"
            className="h-auto min-h-9 min-w-0 px-3 py-2 text-sm"
          >
            {translate("plan")}
          </Tab>
          <Tab
            value="answers"
            className="h-auto min-h-9 min-w-0 px-3 py-2 text-sm"
          >
            {translate("answers")}
          </Tab>
          <Tab
            value="access"
            className="h-auto min-h-9 min-w-0 px-3 py-2 text-sm"
          >
            {translate("access")}
          </Tab>
          <TabsIndicator className="motion-reduce:transition-none" />
        </TabsList>
      </div>
      <TabsPanel value="plan" keepMounted>
        {plan}
      </TabsPanel>
      <TabsPanel value="answers" keepMounted>
        {answers}
      </TabsPanel>
      <TabsPanel value="access" keepMounted>
        {access}
      </TabsPanel>
    </Tabs>
  );
};

export const BrandSummary = ({
  summary,
  terms,
}: {
  summary: string;
  terms?: readonly string[];
}) => {
  const translate = useTranslations("dashboard.brand.design.summaryAction");
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const isLong = summary.length > 420;

  return (
    <div className="mt-4">
      <p
        id={contentId}
        className={cn(
          "wrap-anywhere max-w-3xl whitespace-pre-line text-foreground text-sm leading-7",
          isLong && !expanded && "line-clamp-6",
        )}
      >
        <AnalysisText text={summary} terms={terms} />
      </p>
      {isLong && (
        <Button
          variant="soft"
          color="neutral"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 text-sm"
        >
          {translate(expanded ? "secondary" : "primary")}
        </Button>
      )}
    </div>
  );
};

export const BrandUnavailable = () => {
  const translate = useTranslations("dashboard.brand.design.unavailable");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="px-6 py-10">
      <AlertCircleIcon aria-hidden className="mb-4 size-7 text-warning" />
      <h2 className="font-semibold text-foreground-rich text-xl">
        {translate("title")}
      </h2>
      <p className="mt-2 text-foreground-dimmed text-sm leading-6">
        {translate("description")}
      </p>
      <Button
        className="mt-5"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {translate("action.primary")}
      </Button>
    </div>
  );
};
