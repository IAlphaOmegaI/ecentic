"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { CodeDiff } from "@/components/marketing/interactive/code-comparison";
import { Link } from "@/i18n/navigation";
import * as Signals from "@/server/app/integration/loop/signal-actions";
import type {
  ReturnSignal,
  ReturnSignals,
  SignalMetric,
} from "@/server/app/integration/loop/signal-types";

const categories = [
  "fit",
  "color",
  "material",
  "dimensions",
  "compatibility",
  "contents",
  "not_as_described",
  "damaged",
  "shipping",
  "changed_mind",
  "other",
] as const;
const verdicts = [
  "wrong",
  "missing",
  "vague",
  "accurate",
  "inconclusive",
  "not_checked",
] as const;
const states = [
  "open",
  "ai_checked",
  "fix_proposed",
  "fix_published",
  "dismissed",
] as const;

const Metric = ({ label, metric }: { label: string; metric: SignalMetric }) => {
  const translate = useTranslations("dashboard.loop");
  const formatter = useFormatter();
  return (
    <div className="py-4">
      <p className="font-medium text-sm">{label}</p>
      <p className="mt-2 text-sm tabular-nums">
        {translate("counts", {
          count: formatter.number(metric.returns),
          share:
            metric.gapShare === null
              ? "—"
              : formatter.number(metric.gapShare, {
                  style: "percent",
                  maximumFractionDigits: 1,
                }),
        })}
      </p>
      <p className="mt-2 text-foreground-dimmed text-xs">
        {translate("window", {
          start: formatter.dateTime(new Date(metric.windowStart), {
            dateStyle: "medium",
          }),
          end: formatter.dateTime(new Date(metric.windowEnd), {
            dateStyle: "medium",
          }),
        })}
      </p>
    </div>
  );
};

const Signal = ({
  signal,
  store,
  showProduct,
}: {
  signal: ReturnSignal;
  store: string;
  showProduct: boolean;
}) => {
  const translate = useTranslations("dashboard.loop");
  const formatter = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [run, pending] = useAsyncAction(
    async (operation: "approve" | "dismiss" | "recover") => {
      if (!signal.proposal) return;
      setError(false);
      const input = {
        store,
        proposal: signal.proposal.id,
        revision: signal.proposal.revision,
      };
      const result = await (operation === "approve"
        ? Signals.approveProposal(input)
        : operation === "recover"
          ? Signals.recoverProposal(input)
          : Signals.dismissProposal(input));
      if (!result.success) {
        setError(true);
        return;
      }
      setOpen(false);
      router.refresh();
    },
  );
  const category =
    categories.find((value) => value === signal.attribute) ?? "other";
  const state = states.find((value) => value === signal.status) ?? "open";
  const rows =
    signal.proposal?.diff.map((item) => ({
      key: item.field,
      before: item.before,
      after: item.after,
      note: "",
    })) ?? [];
  const canApprove =
    signal.proposal && ["pending", "proposed"].includes(signal.proposal.status);
  return (
    <article className="min-w-0 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {showProduct && (
            <Link
              href={`/dashboard/${store}/products/${signal.productId}`}
              className="wrap-anywhere font-semibold text-primary"
            >
              {signal.title}
            </Link>
          )}
          <h3 className="mt-2 font-semibold text-base">
            {translate(`category.${category}`)}
          </h3>
          <p className="mt-2 max-w-3xl text-sm">
            {translate("gap", {
              share: formatter.number(signal.share, {
                style: "percent",
                maximumFractionDigits: 1,
              }),
              count: formatter.number(signal.count),
            })}
          </p>
          <p className="mt-2 text-foreground-dimmed text-xs">
            {translate("window", {
              start: formatter.dateTime(new Date(signal.windowStart), {
                dateStyle: "medium",
              }),
              end: formatter.dateTime(new Date(signal.windowEnd), {
                dateStyle: "medium",
              }),
            })}
          </p>
          {signal.exchanges.known > 0 && signal.exchanges.oneSizeUp > 0 && (
            <p className="mt-2 text-sm">
              {translate("exchange", {
                count: formatter.number(signal.exchanges.oneSizeUp),
                total: formatter.number(signal.exchanges.known),
              })}
            </p>
          )}
        </div>
        <div className="text-foreground-dimmed text-sm">
          <p>{translate(`gapStatus.${state}`)}</p>
          <p className="mt-2 tabular-nums">
            {signal.currency === "MIXED"
              ? translate("mixedValue")
              : translate(signal.refundEstimated ? "estimatedValue" : "value", {
                  value: formatter.number(Number(signal.refundValue), {
                    style: "currency",
                    currency: signal.currency,
                  }),
                })}
          </p>
        </div>
      </div>
      {signal.comments.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-sm">{translate("examples")}</h4>
          <ul className="mt-2 list-disc space-y-2 pl-4 text-foreground-dimmed text-sm">
            {[...new Set(signal.comments)].map((comment) => (
              <li key={comment} className="wrap-anywhere">
                {comment}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6">
        <h4 className="font-medium text-sm">{translate("answers")}</h4>
        {signal.checks.length === 0 && (
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("noAnswers")}
          </p>
        )}
        <div className="mt-2 grid min-w-0 gap-4 lg:grid-cols-2">
          {signal.checks.map((check) => {
            const verdict =
              check.status === "correct"
                ? "accurate"
                : check.status === "failed"
                  ? "inconclusive"
                  : (verdicts.find((value) => value === check.status) ??
                    "not_checked");
            return (
              <div key={check.id} className="min-w-0 bg-background-dimmed p-4">
                <p className="font-medium text-sm">
                  {check.surface === "chatgpt" ? "ChatGPT" : "Google AI Mode"}
                </p>
                <p className="mt-2 text-foreground-dimmed text-xs">
                  {translate(`verdict.${verdict}`)}
                </p>
                <p className="wrap-anywhere mt-4 text-sm">{check.prompt}</p>
                {check.answer && (
                  <p className="wrap-anywhere mt-2 whitespace-pre-wrap text-foreground-dimmed text-sm">
                    {check.answer}
                  </p>
                )}
                {check.evidence && (
                  <p className="wrap-anywhere mt-2 text-sm">{check.evidence}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {signal.proposal && (
        <div className="mt-6">
          <h4 className="font-medium text-sm">{translate("proposal")}</h4>
          {signal.proposal.requiresMerchantApproval && category === "fit" && (
            <p className="mt-2 text-foreground-dimmed text-sm">
              {translate("fitApproval")}
            </p>
          )}
          <div className="mt-4">
            <CodeDiff
              rows={rows}
              filename={signal.title}
              label={translate("proposal")}
              before={translate("before")}
              after={translate("after")}
            />
          </div>
          {canApprove && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => setOpen(true)}>
                {translate("action.approve")}
              </Button>
              <Button
                color="neutral"
                variant="ghost"
                disabled={pending}
                onClick={() => run("dismiss")}
              >
                {translate("action.dismiss")}
              </Button>
            </div>
          )}
          {signal.proposal.status === "publishing" && (
            <div className="mt-4">
              <Button
                variant="soft"
                color="neutral"
                disabled={pending}
                onClick={() => run("recover")}
              >
                {translate("action.recover")}
              </Button>
            </div>
          )}
        </div>
      )}
      {signal.measurement && (
        <div className="mt-6">
          <h4 className="font-medium text-sm">{translate("measurement")}</h4>
          <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm">
            {translate("denominatorMissing")}
          </p>
          {signal.measurement.collecting && (
            <p className="mt-2 max-w-3xl text-sm text-warning">
              {translate("collecting")}
            </p>
          )}
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <Metric
              label={translate("beforePeriod")}
              metric={signal.measurement.before}
            />
            <Metric
              label={translate("afterPeriod")}
              metric={signal.measurement.after}
            />
          </div>
          <h5 className="mt-4 font-medium text-sm">{translate("control")}</h5>
          {signal.measurement.excludedControls > 0 && (
            <p className="mt-2 text-foreground-dimmed text-sm">
              {translate("excludedControls", {
                count: formatter.number(signal.measurement.excludedControls),
              })}
            </p>
          )}
          {signal.measurement.controlProducts ? (
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Metric
                label={translate("beforePeriod")}
                metric={signal.measurement.controlBefore}
              />
              <Metric
                label={translate("afterPeriod")}
                metric={signal.measurement.controlAfter}
              />
            </div>
          ) : (
            <p className="mt-2 text-foreground-dimmed text-sm">
              {translate("noControl")}
            </p>
          )}
        </div>
      )}
      <div className="mt-6">
        <h4 className="font-medium text-sm">{translate("knownAi")}</h4>
        <p className="mt-2 text-sm">
          {translate("counts", {
            count: formatter.number(signal.aiStarted.returns),
            share:
              signal.aiStarted.gapShare === null
                ? "—"
                : formatter.number(signal.aiStarted.gapShare, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }),
          })}
        </p>
        <p className="mt-2 max-w-3xl text-foreground-dimmed text-xs">
          {translate("knownAiNote")}
        </p>
      </div>
      {error && !open && (
        <p role="alert" className="mt-4 text-error text-sm">
          {translate("actionFailed")}
        </p>
      )}
      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogPopup className="mt-0 max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <DialogTitle>{translate("approveTitle")}</DialogTitle>
          <DialogDescription>{translate("approveBody")}</DialogDescription>
          <div className="mt-6">
            <CodeDiff
              rows={rows}
              filename={signal.title}
              label={translate("proposal")}
            />
          </div>
          {error && (
            <p role="alert" className="mt-4 text-error text-sm">
              {translate("actionFailed")}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <DialogClose
              render={
                <Button variant="soft" color="neutral" disabled={pending} />
              }
            >
              {translate("cancel")}
            </DialogClose>
            <Button disabled={pending} onClick={() => run("approve")}>
              {translate("action.approve")}
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </article>
  );
};

export const LoopReturnSignals = ({
  store,
  data,
  product,
  queue = false,
}: {
  store: string;
  data: ReturnSignals;
  product?: string;
  queue?: boolean;
}) => {
  const translate = useTranslations("dashboard.loop");
  const router = useRouter();
  const [error, setError] = useState(false);
  const [request, pending] = useAsyncAction(async () => {
    setError(false);
    const result = await Signals.requestChecks({ store });
    setError(!result.success);
    if (result.success) router.refresh();
  });
  const signals = queue
    ? data.signals.filter((signal) => signal.proposal !== null)
    : data.signals;
  if (!data.connected && signals.length === 0) return null;
  return (
    <section
      aria-label={translate("signals")}
      className="min-w-0 border-accent-foreground border-t px-4 py-6 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h2 className="font-semibold text-xl">{translate("signals")}</h2>
          {!product && (
            <p className="mt-2 text-foreground-dimmed text-sm">
              {translate("signalsIntro")}
            </p>
          )}
        </div>
        {data.connected && data.captureConfigured && signals.length > 0 && (
          <Button
            variant="soft"
            color="neutral"
            disabled={pending}
            onClick={() => request()}
          >
            {translate("action.check")}
          </Button>
        )}
      </div>
      {signals.length === 0 && (
        <p className="mt-6 text-foreground-dimmed text-sm">
          {translate("empty")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-error text-sm">
          {translate("actionFailed")}
        </p>
      )}
      <div className="divide-y divide-accent-foreground">
        {signals.map((signal) => (
          <Signal
            key={signal.id}
            signal={signal}
            store={store}
            showProduct={!product}
          />
        ))}
      </div>
    </section>
  );
};
