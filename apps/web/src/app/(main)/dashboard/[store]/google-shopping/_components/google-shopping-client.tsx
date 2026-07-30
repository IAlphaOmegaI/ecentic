"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
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
          title: "Google Shopping",
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
        <Chip tone="neutral">Coming soon</Chip>
        <p className="mt-3 max-w-2xl text-foreground-dimmed text-sm">
          Google Shopping optimization is currently available for Shopify
          stores. WooCommerce support is coming soon.
        </p>
      </div>
    );

  const setup = (() => {
    switch (true) {
      case !status.connected:
        return (
          <Step
            title="Connect Google"
            chip={<Chip tone="neutral">Step 1</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              Sign in with the Google account that manages this store's Merchant
              Center. ecentic only requests access to product listings (Content
              API scope) — never your ads or personal data.
            </p>
            <a href={`/api/integrations/google/install?store=${store}`}>
              <Button color="neutral" disabled={isRunning}>
                Connect Google
              </Button>
            </a>
          </Step>
        );

      case !status.googleAccountId && status.candidateAccounts.length > 0:
        return (
          <Step
            title="Choose your Merchant Center account"
            chip={<Chip tone="warning">Step 2</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              Your Google login can see several Merchant Center accounts — pick
              the one the Google &amp; YouTube channel created for this store.
              Accounts whose registered website doesn't match this store's
              domain are flagged; linking one anyway is possible but usually
              wrong.
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
                        "Merchant Center account selected",
                      )
                    }
                  >
                    {candidate.name
                      ? `${candidate.name} (${candidate.id})`
                      : candidate.id}
                  </Button>
                  {candidate.matchesStore === true ? (
                    <Chip tone="success">
                      {candidate.domain} — matches this store
                    </Chip>
                  ) : (
                    <Chip tone="warning">
                      {candidate.domain ?? "no website set"} — link anyway
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
            title="Waiting for your Merchant Center account"
            chip={<Chip tone="warning">Step 2</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              Install the Google &amp; YouTube channel in your store admin and
              finish its Google connection — it creates and verifies your
              Merchant Center account, then ecentic detects it automatically.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.detectAccount({ store }),
                  "Account check complete",
                )
              }
            >
              Check now
            </Button>
          </Step>
        );

      case status.linkState === "unlinked":
        return (
          <Step
            title="Link your account to ecentic"
            chip={<Chip tone="warning">Step 3</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              ecentic will request management access to your Merchant Center
              account (account {status.googleAccountId}). This lets us attach an
              optimization feed and read diagnostics — you can revoke the access
              in Merchant Center at any time.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.proposeLink({ store }),
                  "Link requested",
                )
              }
            >
              Request link
            </Button>
          </Step>
        );

      case status.linkState === "proposed":
        return (
          <Step
            title="Establishing link"
            chip={<Chip tone="warning">Step 3</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              Your link request is being processed — this usually completes
              within a few minutes.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.checkLink({ store }),
                  "Link status refreshed",
                )
              }
            >
              Check now
            </Button>
          </Step>
        );

      case !status.provisioned:
        return (
          <Step
            title="Set up the optimization feed"
            chip={<Chip tone="warning">Step 4</Chip>}
          >
            <p className="max-w-2xl text-foreground-dimmed text-sm">
              Creates ecentic's supplemental feed on your account and wires it
              into your primary product feed. Your store's plugin keeps owning
              prices, stock, and images — ecentic only layers optimized titles
              and descriptions on top.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.ensureSupplementalDataSource({ store }),
                  "Optimization feed ready",
                )
              }
            >
              Set up optimization feed
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
          run(() => GoogleMerchant.disconnect({ store }), "Google disconnected")
        }
      >
        Disconnect Google
      </Button>
      <p className="text-foreground-dimmed text-xs">
        Removes ecentic's optimization feed and management access from your
        Merchant Center account. Your products and their Google listings stay —
        only the ecentic overrides go away. You can reconnect any time.
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
          label="Live on Google"
          value={status.offers.live}
          tone="success"
        />
        <Stat
          label="Going live (may take a few hours)"
          value={status.offers.pending}
          tone="warning"
        />
        <Stat
          label="Need attention"
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
              "Optimizations pushed — going live on Google",
            )
          }
        >
          Push optimizations
        </Button>
        <Button
          color="neutral"
          disabled={isRunning}
          onClick={() =>
            run(
              () => GoogleMerchant.verifyOverrides({ store }),
              "Status refreshed",
            )
          }
        >
          Refresh status
        </Button>
        <Button
          color="neutral"
          disabled={isRunning}
          onClick={() =>
            run(
              () => GoogleMerchant.checkRuleHealth({ store }),
              "Feed wiring checked",
            )
          }
        >
          Check feed wiring
        </Button>
        <p className="w-full text-foreground-dimmed text-xs">
          Pushes your published listing optimizations as overrides onto the
          matching Google offers. Unchanged items are skipped automatically;
          Google re-checks policies on every override before it goes live.
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
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  const [pull, isPulling] = useAsyncAction(async () => {
    const result = await GoogleMerchant.pullDiagnostics({ store });
    if (!result.success) {
      toast.add({
        title: "Diagnostics",
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
          {isPulling ? "Pulling…" : "Pull diagnostics"}
        </Button>
        <p className="text-foreground-dimmed text-xs">
          Reads account issues, item issues, and disapprovals straight from
          Merchant Center.
        </p>
      </div>

      {diagnostics && (
        <>
          <div className="flex flex-wrap items-center gap-6 bg-background-dimmed px-4 py-3">
            <Stat
              label="Offers on Google"
              value={diagnostics.offerCount}
              tone="success"
            />
            <Stat
              label="Disapproved offers"
              value={diagnostics.disapprovedOffers}
              tone="error"
            />
            <Stat
              label="Account issues"
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
                  {issue.severity ?? "Issue"}
                </Chip>
                <p className="font-medium text-foreground text-sm">
                  {issue.title ?? "Account issue"}
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
              No issues reported — the account and its offers are healthy.
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
                    {issue.severity ?? "Issue"}
                  </Chip>
                  <p className="font-medium text-foreground text-sm">
                    {issue.description ?? issue.code}
                  </p>
                </div>
                <p className="text-foreground-dimmed text-xs">
                  {issue.offerId}
                  {issue.attribute && ` · attribute: ${issue.attribute}`}
                </p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};
