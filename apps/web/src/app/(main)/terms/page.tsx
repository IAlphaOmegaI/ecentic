import type { Icon } from "@zenncore/icons";
import {
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { createMetadata } from "@/lib/seo";
import Art from "@/public/images/ascii/quill.png";
import {
  ContentPageRichText,
  ContentPageSection,
} from "../_components/content";
import { PageBanner } from "../_components/page-banner";

export const metadata: Metadata = createMetadata({
  title: "Terms of Service",
  description:
    "The terms governing your use of ecentic, including the Universal Commerce Protocol service, store integrations, billing, and liability.",
  path: "/terms",
});

const assurances = [
  "Cancel any time",
  "You stay Merchant of Record",
  "Your data stays yours",
] as const;

type Summary = {
  icon: Icon;
  title: string;
  description: string;
};

const summary: readonly Summary[] = [
  {
    icon: RobotIcon,
    title: "What we do",
    description:
      "We make your catalog discoverable to AI shopping agents and serve the UCP protocol surface on your store's behalf.",
  },
  {
    icon: ShieldCheckIcon,
    title: "What you keep",
    description:
      "Your catalog, your customers, your orders. You remain the seller and Merchant of Record on every transaction.",
  },
  {
    icon: ShoppingCartIcon,
    title: "How billing works",
    description:
      "A free scan, pay-as-you-go with a capped performance fee, or a flat subscription. No fee rides a subscription.",
  },
  {
    icon: XCircleIcon,
    title: "How it ends",
    description:
      "Cancel or disconnect at any time. Revoking our store credentials cuts off all access immediately.",
  },
] as const;

const sections = [
  {
    number: "01",
    title: "Agreement to These Terms",
    content: `These Terms of Service ("Terms") govern your access to and use of ecentic (the "Service"), operated by [zennit](https://www.zennit.dev). By creating an account, connecting a store, or installing one of our plugins or apps, you agree to these Terms.

If you are agreeing on behalf of a company, you represent that you have authority to bind that company, and "you" refers to that company.

We may update these Terms. If a change is material, we will notify you by email or in the product before it takes effect. Continuing to use the Service after a change takes effect means you accept the revised Terms.`,
  },
  {
    number: "02",
    title: "The Service",
    content: `ecentic helps merchants win in the AI agent economy. Depending on the plan and integrations you enable, the Service may:

- Simulate how AI shopping assistants compare your products against competitors, and diagnose why a product wins or loses
- Generate optimized product listings that you review and choose to publish back to your store
- Serve the Universal Commerce Protocol (UCP) surface on your store's behalf — discovery, catalog search, cart and checkout sessions, payment handling, request signing, and order webhooks — so AI agents can transact with your store
- Track visits and referrals from AI agents to your storefront

Our UCP integrations (including the écentic for WooCommerce plugin and our Shopify app) connect your store to this hosted surface. What each integration reads and transmits is described in its own listing and in our [Privacy Policy](/privacy-policy).

The Service depends on third-party AI providers and agent platforms whose behavior we do not control. We do not guarantee that any agent will surface, recommend, or purchase your products, or that simulated outcomes will match real ones.`,
  },
  {
    number: "03",
    title: "Your Store, Your Data",
    content: `You retain all rights to your product catalog, your store content, and your customer and order data. Connecting a store grants us a limited licence to access and process that data solely to provide the Service to you.

You are responsible for:

- Having the right to connect the store and share the data you connect
- The accuracy of the catalog and store policy data you expose through the Service
- Reviewing generated listing content before publishing it to your live store
- Keeping your account credentials and API keys secure

You can revoke our access at any time by disconnecting the store or revoking the API credentials it issued us. Access ends immediately when you do.`,
  },
  {
    number: "04",
    title: "Agent Transactions and Merchant of Record",
    content: `When an AI agent places an order through the UCP surface, the order is created in your own store, through your own commerce platform, under your own terms of sale.

You remain the seller and the Merchant of Record for every such order. You are responsible for pricing, tax, fulfilment, returns, refunds, chargebacks, and customer support, exactly as you are for orders placed on your storefront. ecentic is not a party to the sale, does not take title to goods, and does not act as a payment processor or merchant of record.

Where you enable server-side payment processing, payments are charged through your own payment gateway using credentials that stay on your own infrastructure. Your relationship with that payment provider is governed by their terms, not ours.`,
  },
  {
    number: "05",
    title: "Acceptable Use",
    content: `You agree not to:

- Use the Service to list, promote, or transact in goods you are not lawfully permitted to sell
- Misrepresent your products, prices, availability, or business identity to AI agents or shoppers
- Reverse engineer, resell, or provide the Service to third parties as your own
- Attempt to gain unauthorized access to the Service, other merchants' data, or our infrastructure
- Interfere with the Service, circumvent rate limits, or use it in a way that degrades it for others

We may suspend or terminate an account that violates these rules, or where we are required to do so by law or by a platform partner.`,
  },
  {
    number: "06",
    title: "Plans, Fees, and Billing",
    content: `We offer three separate products. Details and current prices are on the [pricing page](/pricing).

- **Scan** — a free, one-time analysis. No card, no billing.
- **Pay-as-you-go** — free to start, with no card required until a fee is actually due. You are billed only a performance fee on revenue we attribute to AI-agent referrals, within the attribution window and subject to a monthly cap.
- **Subscription** — a flat monthly plan (Compete or Dominate). No performance fee ever applies to a subscription.

The performance fee never rides a subscription. Pay-as-you-go runs on calendar months. Where you installed through a commerce platform's own billing (for example Shopify), charges are made through that platform instead.

Fees are exclusive of taxes unless stated otherwise, and are non-refundable except where required by law. You may cancel at any time; cancellation takes effect at the end of the current billing period, and you keep access until then.`,
  },
  {
    number: "07",
    title: "Availability and Support",
    content: `We work to keep the Service — including the hosted UCP endpoints that agents call — available and correct, but we do not promise uninterrupted or error-free operation. We may change, suspend, or discontinue parts of the Service, and we will give reasonable notice before removing functionality you depend on.

Planned maintenance, third-party outages, and changes made by AI platforms or commerce platforms can all affect availability. Support channels and response expectations are described on our [support page](/support).`,
  },
  {
    number: "08",
    title: "Disclaimers and Limitation of Liability",
    content: `The Service is provided "as is" and "as available", without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. Simulations, win-rate figures, and optimization suggestions are estimates, not guarantees of commercial outcomes.

To the maximum extent permitted by law, ecentic and zennit are not liable for any indirect, incidental, special, consequential, or punitive damages, or for any lost profits, lost revenue, lost sales, or lost data, arising out of or related to the Service.

To the maximum extent permitted by law, our total aggregate liability arising out of or related to the Service is limited to the greater of (a) the amount you paid us in the twelve months before the event giving rise to the claim, or (b) one hundred euros (€100).

Nothing in these Terms excludes liability that cannot lawfully be excluded, including liability for fraud, or for death or personal injury caused by negligence.`,
  },
  {
    number: "09",
    title: "Termination",
    content: `You may stop using the Service and delete your account at any time. Deleting your account deletes the data associated with it, as described in our [Privacy Policy](/privacy-policy).

We may suspend or terminate your access if you materially breach these Terms, if your use puts the Service or other merchants at risk, or if we are required to do so by law.

On termination, your stores are disconnected, your hosted UCP surface stops being served, and any fees already incurred remain payable. Sections that by their nature should survive termination — including data ownership, disclaimers, limitation of liability, and governing law — survive it.`,
  },
  {
    number: "10",
    title: "Governing Law and Contact",
    content: `These Terms are governed by the laws of the Republic of Kosovo, without regard to conflict-of-law rules. The courts of Prishtina have exclusive jurisdiction over any dispute arising out of or related to these Terms, subject to any mandatory consumer protections available to you locally.

Questions about these Terms:

- Email: legal@ecentic.ai
- Company: [zennit](https://www.zennit.dev) (ecentic is a product of zennit)`,
  },
] as const;

export default () => (
  <main className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
      <Navbar />
    </div>

    <PageBanner
      eyebrow="Legal"
      title="Terms of"
      accent="Service."
      meta="Last updated: July 12, 2026"
      description="These terms govern your use of ecentic — the platform, the store integrations, and the hosted Universal Commerce Protocol surface that lets AI shopping agents discover and buy from your store."
      assurances={assurances}
      art={Art}
    />

    <ContentPageSection
      number="00"
      title="At a glance"
      description="The short version, in plain language. Every line here is expanded in the numbered sections below."
      classList={{ body: "p-0" }}
    >
      <div className="flex flex-col gap-px bg-accent-foreground">
        {summary.map((item) => (
          <div
            key={item.title}
            className="grid grid-cols-1 gap-2 bg-background px-6 py-5 md:grid-cols-[13rem_1fr] md:gap-8 md:px-8"
          >
            <div className="flex items-center gap-3">
              <item.icon className="size-5 shrink-0 text-primary" />
              <h3 className="font-body font-medium text-foreground text-lg">
                {item.title}
              </h3>
            </div>
            <p className="font-light text-foreground-dimmed leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </ContentPageSection>

    {sections.map((section) => (
      <ContentPageSection
        key={section.number}
        number={section.number}
        title={section.title}
      >
        <ContentPageRichText content={section.content} />
      </ContentPageSection>
    ))}

    <Footer stacked />
  </main>
);
