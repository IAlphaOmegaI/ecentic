"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";

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
  const className = {
    neutral: "bg-foreground/5 text-foreground-dimmed",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  }[tone];

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
        className,
      )}
    >
      {children}
    </span>
  );
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
  <div className="flex flex-col gap-2 p-4">
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
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Button
        color="neutral"
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
      <p className="text-foreground-dimmed text-xs">
        {translate("disconnect.description")}
      </p>
    </div>
  ) : null;

  if (setup)
    return (
      <div className="divide-y divide-accent-foreground">
        {setup}
        {disconnectRow}
      </div>
    );

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      <div className="flex flex-wrap items-center gap-6 bg-background-dimmed px-4 py-3">
        <Stat
          label={translate("stats.live")}
          value={status.offers.live}
          tone="success"
        />
        <Stat
          label={translate("stats.pending")}
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

      <div className="flex flex-wrap items-center gap-3 p-4">
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
        <p className="w-full text-foreground-dimmed text-xs">
          {translate("actions.description")}
        </p>
      </div>
      {disconnectRow}
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "error";
}) => (
  <div className="flex items-baseline gap-2">
    <p
      className={cn(
        "font-bold text-2xl tabular-nums",
        {
          success: "text-success",
          warning: "text-warning",
          error: "text-error",
        }[tone],
      )}
    >
      {value}
    </p>
    <p className="text-foreground-dimmed text-xs">{label}</p>
  </div>
);

const SEVERITY_TONES: Record<string, "neutral" | "warning" | "error"> = {
  ERROR: "error",
  DISAPPROVED: "error",
  WARNING: "warning",
  DEMOTED: "warning",
};

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
      <div className="flex items-center gap-3 p-4">
        <Button color="neutral" disabled={isPulling} onClick={() => pull()}>
          {isPulling ? translate("pulling") : translate("action")}
        </Button>
        <p className="text-foreground-dimmed text-xs">
          {translate("description")}
        </p>
      </div>

      {diagnostics && (
        <>
          <div className="flex flex-wrap items-center gap-6 bg-background-dimmed px-4 py-3">
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
            <div
              key={issue.name ?? issue.title}
              className="flex flex-col gap-1 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={SEVERITY_TONES[issue.severity ?? ""] ?? "neutral"}>
                  {issue.severity ?? translate("issue")}
                </Chip>
                <p className="font-medium text-foreground text-sm">
                  {issue.title ?? translate("accountIssue")}
                </p>
              </div>
              {issue.detail && (
                <p className="max-w-3xl text-foreground-dimmed text-sm">
                  {issue.detail}
                </p>
              )}
            </div>
          ))}

          {diagnostics.itemIssues.length === 0 &&
          diagnostics.accountIssues.length === 0 ? (
            <p className="p-4 text-foreground-dimmed text-sm">
              {translate("empty")}
            </p>
          ) : (
            diagnostics.itemIssues.slice(0, 25).map((issue) => (
              <div
                key={`${issue.offerId}:${issue.code}:${issue.attribute}`}
                className="flex flex-col gap-1 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    tone={SEVERITY_TONES[issue.severity ?? ""] ?? "neutral"}
                  >
                    {issue.severity ?? translate("issue")}
                  </Chip>
                  <p className="font-medium text-foreground text-sm">
                    {issue.description ?? issue.code}
                  </p>
                </div>
                <p className="text-foreground-dimmed text-xs">
                  {issue.offerId}
                  {issue.attribute &&
                    ` · ${translate("attribute", { attribute: issue.attribute })}`}
                </p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};
