"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";

/**
 * Google Shopping controls for one store row in settings. Walks the Path 1
 * state machine — connect → detect account → propose management link →
 * approval → provision (rule-gated) → push — and shows the honest offer
 * lifecycle: pushed overrides are "going live" until the async verification
 * confirms them on Google, which takes hours, not minutes.
 */

const Chip = ({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning";
  children: React.ReactNode;
}) => {
  const className = {
    neutral: "bg-foreground/5 text-foreground-dimmed",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone];

  return (
    <span
      className={`rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em] ${className}`}
    >
      {children}
    </span>
  );
};

export const GoogleMerchantControls = ({
  store,
  status,
}: {
  store: { id: string; platform: string };
  status: GoogleMerchant.Status | null;
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

  if (!status?.supported)
    return (
      <div className="mt-3 flex items-center gap-3 border-accent-foreground border-t pt-3">
        <span className="text-foreground-dimmed text-xs">Google Shopping</span>
        <Chip tone="neutral">
          {store.platform === "woocommerce"
            ? "Coming soon for WooCommerce"
            : "Coming soon"}
        </Chip>
      </div>
    );

  const content = (() => {
    switch (true) {
      case !status.connected:
        return (
          <>
            <Chip tone="neutral">Not connected</Chip>
            <a href={`/api/integrations/google/install?store=${store.id}`}>
              <Button color="neutral" disabled={isRunning}>
                Connect Google
              </Button>
            </a>
          </>
        );

      case !status.googleAccountId && status.candidateAccounts.length > 0:
        return (
          <>
            <Chip tone="warning">Choose Merchant Center account</Chip>
            <p className="text-foreground-dimmed text-xs">
              Your Google login can see several Merchant Center accounts — pick
              the one the Google &amp; YouTube channel created for this store.
            </p>
            {status.candidateAccounts.map((candidate) => (
              <Button
                key={candidate.id}
                color="neutral"
                disabled={isRunning}
                onClick={() =>
                  run(
                    () =>
                      GoogleMerchant.selectAccount({
                        store: store.id,
                        account: candidate.id,
                      }),
                    "Merchant Center account selected",
                  )
                }
              >
                {candidate.name
                  ? `${candidate.name} (${candidate.id})`
                  : candidate.id}
              </Button>
            ))}
          </>
        );

      case !status.googleAccountId:
        return (
          <>
            <Chip tone="warning">Waiting for Merchant Center account</Chip>
            <p className="text-foreground-dimmed text-xs">
              Install the Google &amp; YouTube channel in your store admin and
              finish its Google connection.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.detectAccount({ store: store.id }),
                  "Account check complete",
                )
              }
            >
              Check now
            </Button>
          </>
        );

      case status.linkState === "unlinked":
        return (
          <>
            <Chip tone="warning">Account detected</Chip>
            <p className="text-foreground-dimmed text-xs">
              Écentic will request management access to your Merchant Center
              account — you approve it inside Merchant Center, and you can
              revoke it there at any time.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.proposeLink({ store: store.id }),
                  "Link requested — approve it in Merchant Center",
                )
              }
            >
              Request link
            </Button>
          </>
        );

      case status.linkState === "proposed":
        return (
          <>
            <Chip tone="warning">Establishing link</Chip>
            <p className="text-foreground-dimmed text-xs">
              Your link request is being processed — this usually completes
              within a few minutes.
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.checkLink({ store: store.id }),
                  "Link status refreshed",
                )
              }
            >
              Check now
            </Button>
          </>
        );

      case !status.provisioned:
        return (
          <>
            <Chip tone="success">Linked</Chip>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () =>
                    GoogleMerchant.ensureSupplementalDataSource({
                      store: store.id,
                    }),
                  "Optimization feed ready",
                )
              }
            >
              Set up optimization feed
            </Button>
          </>
        );

      default:
        return (
          <>
            <Chip tone="success">Active</Chip>
            <p className="text-foreground-dimmed text-xs">
              {status.offers.live} live on Google
              {status.offers.pending > 0 &&
                ` · ${status.offers.pending} going live (may take a few hours)`}
              {status.offers.error > 0 &&
                ` · ${status.offers.error} need attention`}
            </p>
            <Button
              color="neutral"
              disabled={isRunning}
              onClick={() =>
                run(
                  () => GoogleMerchant.pushOverrides({ store: store.id }),
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
                  () => GoogleMerchant.verifyOverrides({ store: store.id }),
                  "Status refreshed",
                )
              }
            >
              Refresh status
            </Button>
          </>
        );
    }
  })();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-accent-foreground border-t pt-3">
      <span className="text-foreground-dimmed text-xs">Google Shopping</span>
      {content}
    </div>
  );
};
