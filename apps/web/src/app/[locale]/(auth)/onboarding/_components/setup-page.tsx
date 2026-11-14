"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export const SetupPage = ({
  title,
  description,
  image,
  icon,
  children,
  guidance,
}: {
  title: string;
  description: string;
  image?: string;
  icon?: ReactNode;
  children: ReactNode;
  guidance: ReactNode;
}) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <Motion.Stagger
        stagger={0.04}
        className="flex min-h-full min-w-0 flex-col"
      >
        <Motion.Item className="relative isolate shrink-0 border-accent-foreground border-b px-6 py-8 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/10 via-background-rich to-background-rich [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,16px_100%,0_calc(100%_-_16px))]"
          />
          {icon ??
            (image && (
              <Image
                src={image}
                alt=""
                width={64}
                height={48}
                className="mb-6 h-10 w-20 object-contain object-left"
              />
            ))}
          <h1 className="font-heading font-medium text-3xl text-foreground-rich tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-foreground-dimmed leading-relaxed sm:text-lg">
            {description}
          </p>
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        </Motion.Item>
        <div className="grid min-w-0 flex-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Motion.Item className="min-w-0 px-6 py-8 sm:px-8">
            {children}
          </Motion.Item>
          <Motion.Item className="min-w-0 border-accent-foreground border-t bg-linear-to-br from-primary/10 via-primary/5 to-background-rich px-6 py-8 sm:px-8 xl:border-t-0 xl:border-l">
            {guidance}
          </Motion.Item>
        </div>
      </Motion.Stagger>
    </div>
    <SetupFooter />
  </div>
);

export const SetupSteps = ({
  title,
  steps,
}: {
  title: string;
  steps: readonly string[];
}) => (
  <section className="min-w-0">
    <h2 className="mb-6 font-heading font-medium text-foreground-rich text-xl">
      {title}
    </h2>
    <ol className="min-w-0">
      {steps.map((step, index) => (
        <li
          key={step}
          className="relative grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-4 pb-6 last:pb-0"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-8 bottom-0 left-4 w-px bg-primary/20"
            />
          )}
          <span
            aria-hidden="true"
            className="relative flex size-8 shrink-0 items-center justify-center rounded-sm border border-primary/20 bg-background-rich text-primary-text text-sm tabular-nums"
          >
            {index + 1}
          </span>
          <p className="min-w-0 pt-1 text-foreground text-sm leading-relaxed [overflow-wrap:anywhere]">
            {step}
          </p>
        </li>
      ))}
    </ol>
  </section>
);

const SetupFooter = () => {
  const translate = useTranslations("onboarding.connect");
  return (
    <footer className="relative flex shrink-0 flex-wrap items-center justify-between gap-4 border-accent-foreground border-t bg-background-rich py-4 pr-24 pl-6 sm:pl-8">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Button
        color="accent"
        type="button"
        render={<Link href="/onboarding/connect" />}
      >
        <Back />
      </Button>
      <p className="max-w-xs text-foreground-dimmed text-sm">
        {translate("footer.settingsHint")}
      </p>
    </footer>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.connect");
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      {translate("footer.backToPlatforms")}
    </>
  );
};
