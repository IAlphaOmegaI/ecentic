"use client";

import {
  ArrowLeftIcon,
  AwardIcon,
  LoaderIcon,
  ShareIcon,
  ShoppingCartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { Progress } from "@zenncore/web/components/progress";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useLinkStatus } from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useOnboardingError } from "@/app/[locale]/(auth)/onboarding/_components/use-onboarding-error";
import { Motion } from "@/components/motion";
import { Link, useRouter } from "@/i18n/navigation";
import * as Payg from "@/server/app/billing/payg";
import type * as Simulate from "@/server/app/intelligence/simulate";

const models = [
  { id: "gpt4", label: "ChatGPT", logo: "/images/chatgpt.svg" },
  { id: "claude", label: "Claude", logo: "/images/claude.svg" },
  { id: "gemini", label: "Gemini", logo: "/images/gemini.svg" },
] as const;

export namespace CompletePhase {
  export type Props = {
    wins: number;
    losses: number;
    winRates: Record<string, { wins: number; losses: number; rate: number }>;
    topFinding: Simulate.TopFinding | null;
    products: number;
    scanId: string | null;
  };
}

export const CompletePhase = ({
  wins,
  losses,
  winRates,
  topFinding,
  products: finalProductCount,
  scanId,
}: CompletePhase.Props) => {
  const translate = useTranslations("onboarding.scan");
  const format = useFormatter();
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const message = (() => {
    switch (true) {
      case winRate < 30:
        return translate("complete.messages.low");
      case winRate < 60:
        return translate("complete.messages.medium");
      default:
        return translate("complete.messages.high");
    }
  })();

  const color = (() => {
    switch (true) {
      case winRate < 30:
        return "text-error";
      case winRate < 60:
        return "text-warning";
      default:
        return "text-success";
    }
  })();

  const router = useRouter();
  const toast = useToastManager();
  const formatError = useOnboardingError();

  const [handleStartFree, isStartingFree] = useAsyncAction(async () => {
    const activation = await Payg.startPayAsYouGo();
    if (!activation.success) {
      toast.add({
        title: translate("complete.toast.paygFailed"),
        description: formatError(activation.error),
        type: "error",
      });
      return;
    }
    router.push("/dashboard");
  });

  return (
    <Motion.Stagger
      key="complete"
      stagger={0.04}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Motion.Item className="border-accent-foreground border-b bg-linear-to-br from-primary/10 via-background-rich to-background-rich px-6 py-7 sm:px-8">
          <h1 className="font-heading font-medium text-3xl text-foreground-rich tracking-tight sm:text-4xl">
            {translate("complete.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
            {message}
          </p>
        </Motion.Item>

        <Motion.Item className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-b bg-background-rich">
          {models.map(({ id, label, logo }) => {
            const rates = winRates[id];
            const rate = rates?.rate ?? 0;
            return (
              <div key={id} className="flex min-w-0 flex-col px-3 py-5 sm:px-6">
                <Image
                  src={logo}
                  alt=""
                  width={32}
                  height={32}
                  className="mb-3 size-8 object-contain"
                />
                <h2 className="font-medium text-foreground-rich text-sm sm:text-base">
                  {label}
                </h2>
                <dl className="mt-3 space-y-1 text-xs tabular-nums">
                  <div className="flex flex-wrap justify-between gap-x-2">
                    <dt className="text-foreground-dimmed">
                      {translate("complete.stats.wins")}
                    </dt>
                    <dd className="text-success">
                      {format.number(rates?.wins ?? 0)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-2">
                    <dt className="text-foreground-dimmed">
                      {translate("complete.stats.losses")}
                    </dt>
                    <dd className="text-foreground">
                      {format.number(rates?.losses ?? 0)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-foreground-rich text-sm tabular-nums">
                  {format.number(rate)}%
                </p>
                <Progress
                  value={rate}
                  aria-label={`${label}: ${translate("complete.stats.winRate")}`}
                  className="mt-2"
                  classList={{ indicator: "motion-reduce:transition-none" }}
                />
              </div>
            );
          })}
        </Motion.Item>

        {topFinding && (
          <Motion.Item className="border-accent-foreground border-b bg-primary/5 px-6 py-6 sm:px-8">
            <h2 className="mb-2 font-medium text-primary-text">
              {translate("complete.topFinding")}
            </h2>
            <p className="text-foreground leading-relaxed">
              {translate("complete.topFindingBody", {
                name: topFinding.name,
                attributes: format.list(topFinding.missingAttributes, {
                  type: "conjunction",
                }),
                impact: topFinding.impactDescription,
                percentage: String(topFinding.lossPercentage),
              })}
            </p>
          </Motion.Item>
        )}

        <Motion.Item className="grid grid-cols-2 gap-px bg-accent-foreground">
          <div className="min-w-0 bg-background-rich px-6 py-5 sm:px-8">
            <AwardIcon
              aria-hidden="true"
              className="mb-3 size-6 text-primary-text"
            />
            <p className={cn("font-medium text-2xl tabular-nums", color)}>
              {format.number(winRate)}%
            </p>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("complete.stats.winRate")}
            </p>
          </div>
          <div className="min-w-0 bg-background-rich px-6 py-5 sm:px-8">
            <ShoppingCartIcon
              aria-hidden="true"
              className="mb-3 size-6 text-primary-text"
            />
            <p className="font-medium text-2xl text-foreground-rich tabular-nums">
              {format.number(finalProductCount)}
            </p>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("complete.stats.products")}
            </p>
          </div>
          <div className="min-w-0 bg-background-rich px-6 py-5 sm:px-8">
            <TrendUpIcon
              aria-hidden="true"
              className="mb-3 size-6 text-success"
            />
            <p className="font-medium text-2xl text-foreground-rich tabular-nums">
              {format.number(wins)}
            </p>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("complete.stats.wins")}
            </p>
          </div>
          <div className="min-w-0 bg-background-rich px-6 py-5 sm:px-8">
            <TrendDownIcon
              aria-hidden="true"
              className="mb-3 size-6 text-foreground-dimmed"
            />
            <p className="font-medium text-2xl text-foreground-rich tabular-nums">
              {format.number(losses)}
            </p>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("complete.stats.losses")}
            </p>
          </div>
        </Motion.Item>
      </div>

      <Motion.Item className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-accent-foreground border-t bg-background-rich px-6 py-4 sm:px-8">
        <Button
          color="accent"
          type="button"
          render={<Link href="/onboarding/scan" />}
        >
          <Back />
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {scanId && (
            <Button
              color="accent"
              type="button"
              render={<Link href={`/share/${scanId}`} />}
            >
              <ShareButton />
            </Button>
          )}
          <Button
            color="primary"
            type="button"
            onClick={() => handleStartFree()}
            disabled={isStartingFree}
          >
            {isStartingFree ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ShoppingCartIcon className="size-4" />
            )}
            {translate("complete.action.startFree")}
          </Button>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.scan");

  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      {translate("complete.action.back")}
    </>
  );
};

const ShareButton = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.scan");

  return (
    <>
      {translate("complete.action.share")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ShareIcon className="size-4" />
      )}
    </>
  );
};
