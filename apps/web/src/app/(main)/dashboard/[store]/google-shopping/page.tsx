import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
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
}: {
  /** null = the check could not run — rendered as "Unknown", not as failure. */
  ok: boolean | null;
  title: string;
  detail: string;
  href?: string;
  linkLabel?: string;
}) => (
  <div className="flex flex-col gap-1 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={ok === null ? "neutral" : ok ? "success" : "warning"}>
        {ok === null ? "Unknown" : ok ? "Ready" : "Action needed"}
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
            {linkLabel ?? "Learn more"}
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
  const [readiness, products] = await Promise.all([
    GoogleMerchant.getUcpReadiness(Environment.SERVER, { store }),
    GoogleMerchant.getUcpProducts(Environment.SERVER, { store }),
  ]);

  if (!readiness.success)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        Could not read checkout readiness from Merchant Center:{" "}
        {readiness.error.message}
      </p>
    );
  if (!products.success)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        Could not load the store's products: {products.error.message}
      </p>
    );

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
        return "No return policy on the account — a Merchant-of-Record requirement, shown on Google's checkout screen. Create one below and ecentic writes it to Merchant Center.";
      case !returnPolicy.hasWindow:
        return `${returnPolicy.count} policy(ies) found, but none defines a return window (days after delivery or lifetime).`;
      case !returnPolicy.hasPolicyLink:
        return `${returnPolicy.count} policy(ies) found, but none links to the full policy text.`;
      case !returnPolicy.hasCost:
        return `${returnPolicy.count} policy(ies) found, but none states the return shipping cost — required alongside window and link.`;
      default:
        return `${returnPolicy.count} policy(ies) with a return window, shipping cost, and a full-policy link.`;
    }
  })();

  return (
    <div className="flex flex-col divide-y divide-accent-foreground">
      <ReadinessRow
        ok={homepage?.claimed ?? null}
        title="Store website claimed"
        detail={
          homepage
            ? homepage.claimed
              ? `${homepage.uri ?? "Homepage"} is verified and claimed.`
              : `${homepage.uri ?? "The homepage"} is set but not claimed — your store's Google plugin normally handles this.`
            : "No homepage is registered on the Merchant Center account."
        }
      />
      <div>
        <ReadinessRow
          ok={returnPolicyOk}
          title="Return policy"
          detail={returnPolicyDetail}
          href="https://support.google.com/merchants/answer/14011730"
          linkLabel="Or manage in Merchant Center"
        />
        <ReturnPolicyEditor store={store} current={returnPolicy.current} />
      </div>
      <div>
        <ReadinessRow
          ok={customerSupport.configured}
          title="Customer support contact"
          detail={
            customerSupport.configured
              ? `Set (${customerSupport.methods.join(", ")}) — becomes the "Contact Merchant" link on Google's order confirmation.`
              : "No customer service website, email, or phone on the account — set it right here, ecentic writes it to Merchant Center."
          }
          href="https://support.google.com/merchants/answer/13661344"
          linkLabel="Or edit in Merchant Center"
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
        title="Products approved for free listings"
        detail={`${offers.approved} of ${offers.total} offers approved for free listings${
          offers.disapproved > 0
            ? `, ${offers.disapproved} disapproved (see diagnostics above)`
            : ""
        }.${
          offers.checkoutAttributeLive > 0
            ? ` ${offers.checkoutAttributeLive} carry the checkout-eligibility flag on Google.`
            : ""
        }${
          offers.ucpCheckoutApproved > 0
            ? ` ${offers.ucpCheckoutApproved} are approved for agentic checkout itself.`
            : ""
        }`}
      />
      <ReadinessRow
        ok={ready ? true : null}
        title="Join Google's UCP waitlist"
        detail={
          ready
            ? "Merchant Center is ready — apply for the agentic checkout program. Google must approve the integration before checkout goes live."
            : "Available once the checks above are green. Google approves each merchant before checkout goes live."
        }
        href="https://support.google.com/merchants/contact/ucp_integration_interest"
        linkLabel="Open the waitlist form"
      />
      <div className="flex flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Handled by Shopify</Chip>
          <p className="font-medium text-foreground text-sm">
            Payments, checkout, and order sync
          </p>
        </div>
        <p className="max-w-3xl text-foreground-dimmed text-xs">
          The Google Pay handler, UCP profile, checkout endpoints, and order
          webhooks are your commerce platform's side of the integration — for
          Shopify stores they ship with Shopify's own agentic checkout rails.
          ecentic prepares everything Merchant Center-side: readiness above,
          eligibility flags below.
        </p>
      </div>

      <div className="border-accent-foreground bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
          Checkout eligibility per product
        </p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          Eligibility defaults to off — Google treats missing flags as not
          eligible. Choices here ride the next "Push optimizations" run as
          `native_commerce` attributes on the supplemental feed.
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
                Merchant Center diagnostics
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                Why products are disapproved or limited on Google
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
                Agentic checkout (UCP)
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                Sell directly inside Google's AI surfaces
              </p>
              <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
                Google is rolling out agent-driven checkout in AI Mode and
                Gemini. ecentic audits your Merchant Center prerequisites and
                pushes the required checkout-eligibility attributes through the
                optimization feed it already manages.
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
