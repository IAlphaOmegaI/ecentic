import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Environment } from "@/server/utils/environment";
import { SectionGutter } from "../../_components/grid";
import {
  Chip,
  DiagnosticsPanel,
  GoogleShoppingManager,
} from "./_components/google-shopping-client";
import {
  GoogleShoppingShell,
  ManagerSkeleton,
  SectionBox,
} from "./_components/shell";
import {
  CustomerSupportEditor,
  ReturnPolicyEditor,
  UcpProductsPanel,
} from "./_components/ucp-checkout-client";

const ReadinessRow = ({
  ok,
  title,
  detail,
  href,
  linkLabel,
  labels,
}: {
  /** null = the check could not run — rendered as "Unknown", not as failure. */
  ok: boolean | null;
  title: string;
  detail: string;
  href?: string;
  linkLabel?: string;
  labels: { unknown: string; ready: string; actionNeeded: string };
}) => (
  <div className="flex flex-col gap-1 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={ok === null ? "neutral" : ok ? "success" : "warning"}>
        {ok === null ? labels.unknown : ok ? labels.ready : labels.actionNeeded}
      </Chip>
      <p className="font-medium text-foreground text-sm">{title}</p>
    </div>
    <p className="max-w-3xl text-foreground-dimmed text-xs">
      {detail}
      {href && (
        <>
          {" "}
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {linkLabel}
          </a>
        </>
      )}
    </p>
  </div>
);

/**
 * Agentic-checkout (UCP) readiness + per-product eligibility. The four
 * API-auditable checks come from {@link GoogleMerchant.getUcpReadiness}; the
 * steps Google keeps manual (waitlist, Google Pay, checkout rails) render as
 * static rows so the merchant sees the whole path, not just our slice of it.
 */
const UcpContent = async ({ store }: { store: string }) => {
  await connection();
  const translate = await getTranslations("dashboard.googleShopping.readiness");
  const [readiness, products] = await Promise.all([
    GoogleMerchant.getUcpReadiness(Environment.SERVER, { store }),
    GoogleMerchant.getUcpProducts(Environment.SERVER, { store }),
  ]);

  if (!readiness.success)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("readinessError", { error: readiness.error.message })}
      </p>
    );
  if (!products.success)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("productsError", { error: products.error.message })}
      </p>
    );

  const labels = {
    unknown: translate("unknown"),
    ready: translate("ready"),
    actionNeeded: translate("actionNeeded"),
  };

  const { homepage, returnPolicy, customerSupport, offers, ready } =
    readiness.data;

  const returnPolicyOk =
    returnPolicy.configured &&
    returnPolicy.hasWindow &&
    returnPolicy.hasPolicyLink &&
    returnPolicy.hasCost;
  const returnPolicyDetail = (() => {
    switch (true) {
      case !returnPolicy.configured:
        return translate("returnPolicy.missing");
      case !returnPolicy.hasWindow:
        return translate("returnPolicy.noWindow", {
          count: returnPolicy.count,
        });
      case !returnPolicy.hasPolicyLink:
        return translate("returnPolicy.noLink", { count: returnPolicy.count });
      case !returnPolicy.hasCost:
        return translate("returnPolicy.noCost", { count: returnPolicy.count });
      default:
        return translate("returnPolicy.ok", { count: returnPolicy.count });
    }
  })();

  const offersDetail = [
    translate("offers.approved", {
      approved: offers.approved,
      total: offers.total,
    }),
    offers.disapproved > 0 &&
      translate("offers.disapproved", { count: offers.disapproved }),
    offers.checkoutAttributeLive > 0 &&
      translate("offers.checkoutFlag", { count: offers.checkoutAttributeLive }),
    offers.ucpCheckoutApproved > 0 &&
      translate("offers.checkoutApproved", {
        count: offers.ucpCheckoutApproved,
      }),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      <ReadinessRow
        ok={homepage?.claimed ?? null}
        title={translate("homepage.title")}
        labels={labels}
        detail={
          homepage
            ? translate(
                homepage.claimed ? "homepage.claimed" : "homepage.unclaimed",
                {
                  uri: homepage.uri ?? translate("homepage.fallback"),
                },
              )
            : translate("homepage.missing")
        }
      />
      <div>
        <ReadinessRow
          ok={returnPolicyOk}
          title={translate("returnPolicy.title")}
          detail={returnPolicyDetail}
          labels={labels}
          href="https://support.google.com/merchants/answer/14011730"
          linkLabel={translate("returnPolicy.link")}
        />
        <ReturnPolicyEditor store={store} current={returnPolicy.current} />
      </div>
      <div>
        <ReadinessRow
          ok={customerSupport.configured}
          title={translate("customerSupport.title")}
          labels={labels}
          detail={
            customerSupport.configured
              ? translate("customerSupport.configured", {
                  methods: customerSupport.methods.join(", "),
                })
              : translate("customerSupport.missing")
          }
          href="https://support.google.com/merchants/answer/13661344"
          linkLabel={translate("customerSupport.link")}
        />
        <CustomerSupportEditor
          store={store}
          current={{
            email: customerSupport.email,
            uri: customerSupport.uri,
            phone: customerSupport.phone,
          }}
        />
      </div>
      <ReadinessRow
        ok={offers.total > 0 ? offers.approved > 0 : null}
        title={translate("offers.title")}
        detail={offersDetail}
        labels={labels}
      />
      <ReadinessRow
        ok={ready ? true : null}
        title={translate("waitlist.title")}
        labels={labels}
        detail={translate(ready ? "waitlist.ready" : "waitlist.pending")}
        href="https://support.google.com/merchants/contact/ucp_integration_interest"
        linkLabel={translate("waitlist.link")}
      />
      <div className="flex flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">{translate("platform.chip")}</Chip>
          <p className="font-medium text-foreground text-sm">
            {translate("platform.title")}
          </p>
        </div>
        <p className="max-w-3xl text-foreground-dimmed text-xs">
          {translate("platform.description")}
        </p>
      </div>

      <div className="border-accent-foreground bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
          {translate("eligibility.eyebrow")}
        </p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          {translate("eligibility.description")}
        </p>
      </div>
      <UcpProductsPanel store={store} products={products.data} />
    </div>
  );
};

/**
 * Manager + diagnostics off one status read. Diagnostics only exist once a
 * Merchant Center account is detected for the store — before that every call
 * behind the panel fails with "No Merchant Center account detected yet", so the
 * whole section stays out of the DOM rather than offering a dead button.
 */
const ChannelSections = async ({
  params,
}: {
  params: PageProps<"/dashboard/[store]/google-shopping">["params"];
}) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.googleShopping");
  const status = unwrapResult(
    await GoogleMerchant.getStatus(Environment.SERVER, { store }),
  );

  return (
    <>
      <SectionBox>
        <GoogleShoppingManager store={store} status={status} />
      </SectionBox>

      {status.googleAccountId !== null && (
        <>
          <SectionGutter />
          <SectionBox>
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                {translate("diagnostics.eyebrow")}
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                {translate("diagnostics.title")}
              </p>
            </div>
            <DiagnosticsPanel store={store} />
          </SectionBox>
        </>
      )}

      {status.provisioned && (
        <>
          <SectionGutter />
          <SectionBox>
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                {translate("ucp.eyebrow")}
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                {translate("ucp.title")}
              </p>
              <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
                {translate("ucp.description")}
              </p>
            </div>
            <Suspense fallback={<ManagerSkeleton />}>
              <UcpContent store={store} />
            </Suspense>
          </SectionBox>
        </>
      )}
    </>
  );
};

// Synchronous so the header prerenders into the static shell; `params` is
// request data and is handed to the streamed leaf that actually needs a store.
export default ({
  params,
}: PageProps<"/dashboard/[store]/google-shopping">) => (
  <GoogleShoppingShell>
    <Suspense
      fallback={
        <SectionBox>
          <ManagerSkeleton />
        </SectionBox>
      }
    >
      <ChannelSections params={params} />
    </Suspense>
  </GoogleShoppingShell>
);
