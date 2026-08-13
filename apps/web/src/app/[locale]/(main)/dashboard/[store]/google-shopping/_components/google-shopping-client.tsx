"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { StatusPill } from "../../../_components/grid";

/**
 * Full Google Shopping management surface for one store. Walks the Path 1
 * state machine — connect → detect/pick account → link → provision
 * (rule-gated) — then exposes the push/verify loop and on-demand diagnostics.
 * The offer lifecycle copy is deliberately honest: pushed overrides are
 * "going live" until the async verification confirms them on Google, which
 * takes hours, not minutes.
 */

type Diagnostics = Extract<
  Awaited<ReturnType<typeof GoogleMerchant.pullDiagnostics>>,
  { success: true }
>["data"];

export const Chip = ({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "error";
  children: React.ReactNode;
}) => {
  return <StatusPill tone={tone}>{children}</StatusPill>;
};

const Step = ({
  title,
  chip,
  children,
}: {
  title: string;
  chip: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2">
      {chip}
      <p className="font-medium text-foreground text-sm">{title}</p>
    </div>
    {children}
  </div>
);

export const GoogleShoppingManager = ({
  store,
  status,
}: {
  store: string;
  status: GoogleMerchant.Status;
}) => {
  const toast = useToastManager();
  const router = useRouter();
  const translate = useTranslations("dashboard.googleShopping");

  const [run, isRunning] = useAsyncAction(
    async (
      action: () => Promise<
        { success: true; data: unknown } | { success: false; error: Error }
      >,
      successTitle: string,
    ) => {
      const result = await action();
      if (!result.success) {
        toast.add({
          title: translate("toast"),
          description: result.error.message,
          type: "error",
        });
        return;
      }
      toast.add({ title: successTitle, type: "success" });
      router.refresh();
    },
  );

  if (!status.supported)
    return (
      <div className="p-6">
        <Chip tone="neutral">{translate("unsupported.chip")}</Chip>
        <p className="mt-3 max-w-2xl text-foreground-dimmed text-sm">
          {translate("unsupported.description")}
        </p>
      </div>
    );

  const currentStep = !status.connected
    ? 1
    : !status.googleAccountId
      ? 2
      : status.linkState !== "active"
        ? 3
        : !status.provisioned
          ? 4
          : 5;

  const setupSteps = [
    translate("setup.connect.title"),
    translate("setup.chooseAccount.title"),
    translate("setup.link.title"),
    translate("setup.feed.title"),
  ];

  const setup = (() => {
    switch (true) {
      case !status.connected:
        return (
          <Step
            title={translate("setup.connect.title")}
            chip={
              <Chip tone="neutral">
                {translate("setup.step", { number: 1 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.connect.description")}
            </p>
            <a href={`/api/integrations/google/install?store=${store}`}>
              <Button color="neutral" disabled={isRunning}>
                {translate("setup.connect.action")}
              </Button>
            </a>
          </Step>
        );

      case !status.googleAccountId && status.candidateAccounts.length > 0:
        return (
          <Step
            title={translate("setup.chooseAccount.title")}
            chip={
              <Chip tone="warning">
                {translate("setup.step", { number: 2 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.chooseAccount.description")}
            </p>
            <div className="flex flex-col gap-2">
              {status.candidateAccounts.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Button
                    color="neutral"
                    disabled={isRunning}
                    onClick={() =>
                      run(
                        () =>
                          GoogleMerchant.selectAccount({
                            store,
                            account: candidate.id,
                            force: candidate.matchesStore !== true,
                          }),
                        translate("setup.chooseAccount.selected"),
                      )
                    }
                  >
                    {candidate.name
                      ? `${candidate.name} (${candidate.id})`
                      : candidate.id}
                  </Button>
                  {candidate.matchesStore === true ? (
                    <Chip tone="success">
                      {translate("setup.chooseAccount.matches", {
                        domain: candidate.domain ?? "",
                      })}
                    </Chip>
                  ) : (
                    <Chip tone="warning">
                      {translate("setup.chooseAccount.linkAnyway", {
                        domain:
                          candidate.domain ??
                          translate("setup.chooseAccount.noWebsite"),
                      })}
                    </Chip>
                  )}
                </div>
              ))}
            </div>
          </Step>
        );

      case !status.googleAccountId:
        return (
          <Step
            title={translate("setup.waitingAccount.title")}
            chip={
              <Chip tone="warning">
                {translate("setup.step", { number: 2 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.waitingAccount.description")}
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.detectAccount({ store }),
                  translate("setup.waitingAccount.checked"),
                )
              }
            >
              {translate("setup.waitingAccount.action")}
            </Button>
          </Step>
        );

      case status.linkState === "unlinked":
        return (
          <Step
            title={translate("setup.link.title")}
            chip={
              <Chip tone="warning">
                {translate("setup.step", { number: 3 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.link.description", {
                account: status.googleAccountId ?? "",
              })}
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.proposeLink({ store }),
                  translate("setup.link.requested"),
                )
              }
            >
              {translate("setup.link.action")}
            </Button>
          </Step>
        );

      case status.linkState === "proposed":
        return (
          <Step
            title={translate("setup.linkPending.title")}
            chip={
              <Chip tone="warning">
                {translate("setup.step", { number: 3 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.linkPending.description")}
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.checkLink({ store }),
                  translate("setup.linkPending.refreshed"),
                )
              }
            >
              {translate("setup.linkPending.action")}
            </Button>
          </Step>
        );

      case !status.provisioned:
        return (
          <Step
            title={translate("setup.feed.title")}
            chip={
              <Chip tone="warning">
                {translate("setup.step", { number: 4 })}
              </Chip>
            }
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              {translate("setup.feed.description")}
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.ensureSupplementalDataSource({ store }),
                  translate("setup.feed.ready"),
                )
              }
            >
              {translate("setup.feed.action")}
            </Button>
          </Step>
        );

      default:
        return null;
    }
  })();

  const disconnectRow = status.connected ? (
    <div className="flex flex-col gap-3 bg-background-dimmed p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="max-w-3xl text-foreground-dimmed text-xs leading-5">
        {translate("disconnect.description")}
      </p>
      <Button
        color="neutral"
        className="shrink-0"
        disabled={isRunning}
        onClick={() =>
          run(
            () => GoogleMerchant.disconnect({ store }),
            translate("disconnect.done"),
          )
        }
      >
        {translate("disconnect.action")}
      </Button>
    </div>
  ) : null;

  if (setup)
    return (
      <div className="grid gap-px bg-accent-foreground lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="bg-background-dimmed p-5">
          {/* Was the page eyebrow verbatim, which now sits in the header pill
            — this column labels the step list, so it says so. */}
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {translate("setup.label")}
          </p>
          <ol className="mt-4 grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-0">
            {setupSteps.map((label, index) => {
              const number = index + 1;
              const complete = number < currentStep;
              const active = number === currentStep;

              return (
                <li
                  key={label}
                  className="relative flex min-w-0 items-center gap-3 py-2 lg:py-3"
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border font-semibold text-xs tabular-nums",
                      complete &&
                        "border-primary bg-primary text-primary-foreground",
                      active &&
                        "border-primary bg-background-rich text-primary",
                      !complete &&
                        !active &&
                        "border-accent-rich text-foreground-dimmed",
                    )}
                  >
                    {number}
                  </span>
                  <span
                    className={cn(
                      "hidden min-w-0 text-sm lg:block",
                      active
                        ? "font-medium text-foreground"
                        : "text-foreground-dimmed",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex min-h-64 flex-col justify-between bg-background-rich">
          {setup}
          {disconnectRow}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      <div className="grid gap-px bg-accent-foreground sm:grid-cols-3">
        <Stat
          label={translate("stats.live")}
          value={status.offers.live}
          tone="success"
        />
        <Stat
          label={translate("stats.pending")}
          detail={translate("stats.pendingDetail")}
          value={status.offers.pending}
          tone="warning"
        />
        <Stat
          label={translate("stats.attention")}
          value={status.offers.error + status.offers.disapproved}
          tone="error"
        />
      </div>

      {status.offerErrors.length > 0 && (
        <div className="flex flex-col gap-1.5 p-4">
          {status.offerErrors.map((offerError) => (
            <p key={offerError.offerId} className="text-warning text-xs">
              {offerError.offerId}: {offerError.error}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="font-medium text-foreground text-sm">
            {translate("actions.push")}
          </p>
          <p className="mt-1 max-w-3xl text-foreground-dimmed text-xs leading-5">
            {translate("actions.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={isRunning}
            onClick={() =>
              run(
                () => GoogleMerchant.pushOverrides({ store }),
                translate("actions.pushed"),
              )
            }
          >
            {translate("actions.push")}
          </Button>
          <Button
            color="neutral"
            disabled={isRunning}
            onClick={() =>
              run(
                () => GoogleMerchant.verifyOverrides({ store }),
                translate("actions.refreshed"),
              )
            }
          >
            {translate("actions.refresh")}
          </Button>
          <Button
            color="neutral"
            disabled={isRunning}
            onClick={() =>
              run(
                () => GoogleMerchant.checkRuleHealth({ store }),
                translate("actions.wiringChecked"),
              )
            }
          >
            {translate("actions.wiring")}
          </Button>
        </div>
      </div>
      {disconnectRow}
    </div>
  );
};

const STAT_DOTS = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

/**
 * A stat cell in the canonical dashboard form — design.md §11.3.
 *
 * The tone rides a dot beside the label rather than colouring the value: the
 * value used to be painted success/warning/error outright, which rendered "0
 * live on Google" in confident green and "0 need attention" in alarm red. The
 * colour now describes what the row *is*, and the number stays legible on its
 * own (§4.4 — status must read without colour).
 */
const Stat = ({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "error";
  detail?: string;
}) => (
  <div className="flex flex-col gap-2 bg-background-rich p-5 sm:p-6">
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", STAT_DOTS[tone])}
      />
      <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
        {label}
      </p>
    </div>
    <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
      {value}
    </p>
    {detail && <p className="text-foreground-dimmed text-xs">{detail}</p>}
  </div>
);

const SEVERITY_TONES: Record<string, "neutral" | "warning" | "error"> = {
  ERROR: "error",
  DISAPPROVED: "error",
  WARNING: "warning",
  DEMOTED: "warning",
};

/**
 * One diagnostic finding.
 *
 * Shares the readiness-check rhythm used on the visibility page — severity in
 * a fixed left column, the finding in the right — instead of the coloured
 * `border-l-2` bars this panel used to draw, which were a fourth way of saying
 * the same thing the chip already says.
 */
const IssueRow = ({
  severity,
  title,
  detail,
  fallbackLabel,
}: {
  severity?: string | null;
  title: string;
  detail?: string;
  fallbackLabel: string;
}) => (
  <div className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
    <div>
      <Chip tone={SEVERITY_TONES[severity ?? ""] ?? "neutral"}>
        {severity ?? fallbackLabel}
      </Chip>
    </div>
    <div className="min-w-0">
      <p className="font-medium text-foreground text-sm">{title}</p>
      {detail && (
        <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
          {detail}
        </p>
      )}
    </div>
  </div>
);

export const DiagnosticsPanel = ({ store }: { store: string }) => {
  const toast = useToastManager();
  const translate = useTranslations("dashboard.googleShopping.diagnostics");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  const [pull, isPulling] = useAsyncAction(async () => {
    const result = await GoogleMerchant.pullDiagnostics({ store });
    if (!result.success) {
      toast.add({
        title: translate("toast"),
        description: result.error.message,
        type: "error",
      });
      return;
    }
    setDiagnostics(result.data);
  });

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <Button color="neutral" disabled={isPulling} onClick={() => pull()}>
          {isPulling ? translate("pulling") : translate("action")}
        </Button>
        <p className="text-foreground-dimmed text-xs">
          {translate("description")}
        </p>
      </div>

      {diagnostics && (
        <>
          {/* Same connected stat grid as the channel status above, rather
            than a loose flex strip on a dimmed band. */}
          <div className="grid gap-px bg-accent-foreground sm:grid-cols-3">
            <Stat
              label={translate("offers")}
              value={diagnostics.offerCount}
              tone="success"
            />
            <Stat
              label={translate("disapproved")}
              value={diagnostics.disapprovedOffers}
              tone="error"
            />
            <Stat
              label={translate("accountIssues")}
              value={diagnostics.accountIssues.length}
              tone="warning"
            />
          </div>

          {diagnostics.accountIssues.map((issue) => (
            <IssueRow
              key={issue.name ?? issue.title}
              severity={issue.severity}
              title={issue.title ?? translate("accountIssue")}
              detail={issue.detail ?? undefined}
              fallbackLabel={translate("issue")}
            />
          ))}

          {diagnostics.itemIssues.length === 0 &&
          diagnostics.accountIssues.length === 0 ? (
            <p className="p-4 text-foreground-dimmed text-sm">
              {translate("empty")}
            </p>
          ) : (
            diagnostics.itemIssues
              .slice(0, 25)
              .map((issue) => (
                <IssueRow
                  key={`${issue.offerId}:${issue.code}:${issue.attribute}`}
                  severity={issue.severity}
                  title={issue.description ?? issue.code ?? translate("issue")}
                  detail={`${issue.offerId}${
                    issue.attribute
                      ? ` · ${translate("attribute", { attribute: issue.attribute })}`
                      : ""
                  }`}
                  fallbackLabel={translate("issue")}
                />
              ))
          )}
        </>
      )}
    </div>
  );
};
