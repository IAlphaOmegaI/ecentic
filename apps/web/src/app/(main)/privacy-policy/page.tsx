import type { Icon } from "@zenncore/icons";
import {
  CheckCircleIcon,
  ShareIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { createMetadata } from "@/lib/seo";
import Art from "@/public/images/ascii/gavel.png";
import { ContentPageSection } from "../_components/content";
import { PageBanner } from "../_components/page-banner";
import { renderInline } from "../_components/rich-text";

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "How ecentic collects, uses, and protects your data when using our e-commerce optimization platform.",
  path: "/privacy-policy",
});

const assurances = [
  "Agent commerce is opt-in",
  "Essential cookies only",
  "Encrypted in transit & at rest",
] as const;

type Summary = {
  icon: Icon;
  title: string;
  description: string;
};

const summary: readonly Summary[] = [
  {
    icon: CheckCircleIcon,
    title: "What we store",
    description:
      "Account basics, the catalog you connect, and — only if you turn on agent commerce — the orders AI agents place.",
  },
  {
    icon: XCircleIcon,
    title: "What we never touch",
    description:
      "Card details, payment gateway secrets, and customer passwords. Scans alone use products-only scopes.",
  },
  {
    icon: ShareIcon,
    title: "Where data goes",
    description:
      "To AI providers during simulations, and to the agent platform an order came from. Never sold for marketing.",
  },
  {
    icon: ShieldCheckIcon,
    title: "What you control",
    description:
      "Delete your account and everything goes with it. GDPR requests: privacy@ecentic.ai.",
  },
] as const;

const sections = [
  {
    title: "Information We Collect",
    number: "01",
    content: `When you create an account, we collect your name, email address, and password (hashed, never stored in plain text).

When you connect a Shopify, WooCommerce, or custom feed store, we access and store:
- Product catalog data (titles, descriptions, prices, images, SKUs, handles, variant information)
- Store domain and name
- OAuth access tokens and API credentials required to read and write product data on your behalf

If you use only the scan and optimization product, that is the whole picture: we do not access or store customer personal data, order data, or payment information, and our Shopify integration requests only the \`read_products\` and \`write_products\` scopes.

**Agent commerce (UCP).** If you additionally turn on agent commerce — by connecting a store through the écentic for WooCommerce plugin or our Shopify app, so that we serve the Universal Commerce Protocol surface on your behalf — we also receive:
- Store policy needed to serve the protocol: currency, shipping options, tax configuration, legal page URLs, payment handler declarations, and your UCP settings
- The orders AI shopping agents place in your store: line items, quantities, totals, and the shopper's name, email address, and shipping and billing address, all of which are required to create and fulfil the order in your store
- Access tokens your store issues when one of your customers links their account to an AI assistant

Agent commerce is off until you explicitly connect a store to it, and it stops the moment you revoke the credentials that store issued us.

**Google Merchant Center.** If you also connect a Google Merchant Center account, we receive the Merchant Center data set out in section 04, which covers our handling of Google user data in full.

We never receive your payment gateway secrets or your customers' passwords, and shoppers' card details are never transmitted to or stored by ecentic — payments are charged by your own payment gateway, using credentials that stay on your own infrastructure.`,
  },
  {
    title: "How We Use Your Data",
    number: "02",
    content: `Your product catalog data is used exclusively to:
- Run AI agent simulations that evaluate how AI shopping models (ChatGPT, Claude, Gemini, Perplexity) compare your products against competitors
- Generate optimization suggestions for product titles, descriptions, and structured data
- Publish approved optimizations back to your connected store via the platform API
- Generate your Universal Commerce Protocol (UCP) merchant profile
- Display analytics, win rates, and reports within your dashboard

Where you have enabled agent commerce, store policy and order data are used exclusively to:
- Serve the UCP protocol surface on your behalf: answer agent catalog searches, price carts against your live store, and run checkout sessions
- Create the resulting order in your store and relay its status back to the agent platform that placed it
- Attribute AI-agent referrals to orders, which is what your dashboard reports and, on pay-as-you-go, what your performance fee is calculated from

We never sell, rent, or share your product data, store policy, or order data with third parties for their own marketing or commercial purposes.`,
  },
  {
    title: "Shopper Data in Agent Checkouts",
    number: "03",
    content: `This section applies only to merchants who have enabled agent commerce.

When an AI shopping agent completes a checkout, the shopper's contact and address details pass through the UCP surface we serve on your behalf, and the order is created in your own store. For that data, **you are the data controller and ecentic is your processor**: we handle it only to carry out the checkout you have asked us to serve, on your documented instructions.

Concretely, this means we:
- Use shopper details solely to price, create, and relay the order, and to pass fulfilment status back to the agent platform the shopper used
- Never use shopper details to market to them, never build shopper profiles across merchants, and never sell or rent that data
- Do not receive card numbers or payment credentials at any point — the charge is made by your own payment gateway

You remain the seller and Merchant of Record, and your own store's privacy notice governs your relationship with the shopper. Requests from shoppers exercising their rights should be directed to you; we will assist you in responding to them, and you can reach us at privacy@ecentic.ai.`,
  },
  {
    title: "Google User Data (Merchant Center)",
    number: "04",
    content: `This section applies only to merchants who connect a Google Merchant Center account, and describes our handling of Google user data under the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

**The access we request.** One scope: https://www.googleapis.com/auth/content — the single scope the Google Merchant API offers for reading and managing Merchant Center data. No narrower scope exists for these operations. Separately, if you choose to sign in to ecentic with Google, that sign-in receives your name, email address, and profile picture, used only to create and identify your ecentic account.

**What we read.** From the Merchant Center account you connect:
- The Merchant Center accounts your Google login can reach — account id and name — and each account's registered homepage, which we use to match the correct account to your store
- Your product offers: offer ids, feed labels, content languages, titles, descriptions, product types, custom attributes, and each offer's processing status, item-level issues, and approval or disapproval state
- Account-level issues and diagnostics
- Your data source configuration, including your primary feed's default rule
- Your online return policies and customer-service contact details, read to audit your readiness for agentic checkout

**What we write.** Only on stores where you have connected Google and asked us to optimize:
- A supplemental data source named "ecentic Optimizations" on your account, and an update to your primary feed's default rule so that source is read first
- Product attribute overrides — titles, descriptions, product types, custom labels, GTINs, and agentic-checkout attributes — pushed into that supplemental data source alone. We never write to your primary feed; your Google plugin keeps ownership of price, availability, images, and links
- Return policies and customer-service contact details, only when you enter and save them in the ecentic dashboard
- An account-management link between your Merchant Center account and ecentic's advanced account, proposed only after you confirm it in our dashboard

**How we use it.** Google user data is used exclusively to deliver the features you connected Google for: identifying and linking the correct Merchant Center account, publishing the optimizations you approve, confirming those optimizations merged onto your live offers, and showing you diagnostics, disapprovals, and checkout readiness in your dashboard. We do not use it for advertising, lending, credit decisions, or any purpose unrelated to those features.

**How we share it.** We do not sell, rent, or transfer Google user data to data brokers, advertisers, or any third party for their own purposes. It is handled by the infrastructure providers that run ecentic — our hosting and database provider and our error-monitoring provider — acting solely as our processors under contract, and by no one else.

**AI and machine learning.** Data read from your Merchant Center account is never sent to AI model providers, and is never used to develop, improve, or train AI or machine-learning models, ours or anyone else's. Our optimization suggestions are generated from the product catalog you sync from your store platform, not from Google's APIs, and are shown to you for approval before anything is written back. ecentic's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.

**How we protect it.** Google OAuth tokens are held in our PostgreSQL database with encryption at rest, transmitted only over TLS, never exposed to your browser, and never written to logs or error reports. The OAuth flow is protected by a short-lived, httpOnly, secure state cookie, and Merchant Center data is readable only by the authenticated ecentic user who owns the connected store.

**How long we keep it, and how to remove it.** We hold your Google tokens and the Merchant Center data we cache for as long as your store stays connected. Disconnecting Google in the ecentic dashboard removes our supplemental data source from your account, restores your primary feed's default rule, ends the account-management link, and immediately deletes your tokens and our records of pushed offers. Deleting your ecentic account deletes all of it. You can also revoke ecentic's access at any time from your [Google Account permissions page](https://myaccount.google.com/permissions); revoking there stops all further access, and any leftover data source can be removed in Merchant Center.`,
  },
  {
    title: "Third-Party Services",
    number: "05",
    content: `We use the following third-party services to operate ecentic:
- **AI Model Providers** (Azure OpenAI, Anthropic, Google, Perplexity): The product catalog you sync from your store platform is sent to AI models during simulations and optimization. Data read from a connected Google Merchant Center account is never sent to them (see section 04). Data is transmitted via encrypted API calls and is not retained by providers beyond the API request lifecycle per their data processing agreements.
- **Sentry**: Error monitoring. May receive anonymized error context (no product data).
- **PostHog**: Product analytics. Receives anonymized usage events (page views, feature interactions). No product catalog data is sent.
- **Resend**: Transactional email delivery (verification codes, notifications). Receives only email addresses and message content.
- **UploadThing**: File storage for uploaded assets. Stores only files you explicitly upload.
- **Vercel**: Hosting infrastructure. Processes requests but does not independently store application data.
- **Stripe**: Billing for your ecentic subscription or performance fee. Receives your billing details and the amounts owed. Shoppers' payment details never pass through this — a shopper's card is charged by your own store's gateway, not ours.`,
  },
  {
    title: "Data Storage & Security",
    number: "06",
    content: `Your data is stored in a PostgreSQL database hosted on infrastructure with encryption at rest and in transit (TLS 1.2+).

We implement standard security practices including:
- HTTPS-only communication
- HMAC signature verification on all incoming Shopify webhooks
- CSRF protection via state/nonce parameters on OAuth flows
- Secure, httpOnly, sameSite cookies for session management
- Password hashing via industry-standard algorithms (bcrypt/argon2)`,
  },
  {
    title: "Data Retention & Deletion",
    number: "07",
    content: `We retain your data for as long as your account is active. When you disconnect a store, the associated access tokens are immediately deleted. Product data imported from that store is retained for your simulation history unless you explicitly request deletion.

Orders placed through agent commerce are retained while your account is active, because they are what your reports and — on pay-as-you-go — your performance fee are calculated from. Where we are required to keep billing records for tax or accounting purposes, we keep the order reference and amount, not the shopper's contact and address details.

When you delete your account, all associated data is permanently deleted, including:
- Your user profile and authentication credentials
- All connected store records and access tokens
- All imported product data
- All simulation results, optimization history, and reports
- Your UCP merchant profile and any agent-placed order records, including shopper details
- Your Google Merchant Center connection: OAuth tokens, the linked account reference, and our records of the offers we pushed

When a Shopify merchant uninstalls the ecentic app, we receive a \`shop/redact\` webhook and automatically delete all store data, products, and associated records for that shop.

For GDPR data subject requests (access, rectification, erasure, portability), contact privacy@ecentic.ai.`,
  },
  {
    title: "Cookies",
    number: "08",
    content: `We use essential cookies only:
- **Session cookies**: Maintain your authenticated session
- **OAuth state cookies**: Short-lived (10 minutes) cookies used during Shopify OAuth flow to prevent CSRF attacks

We do not use advertising cookies or third-party tracking cookies.`,
  },
  {
    title: "Your Rights",
    number: "09",
    content: `Depending on your jurisdiction, you may have the right to:
- Access the personal data we hold about you
- Request correction of inaccurate data
- Request deletion of your data
- Export your data in a portable format
- Object to or restrict certain processing
- Withdraw consent where processing is consent-based

To exercise any of these rights, contact privacy@ecentic.ai.`,
  },
  {
    title: "Changes to This Policy",
    number: "10",
    content:
      "We may update this privacy policy from time to time. Material changes will be communicated via email to the address associated with your account at least 30 days before taking effect. Continued use of ecentic after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact",
    number: "11",
    content: `For questions about this privacy policy or our data practices:
- Email: privacy@ecentic.ai
- Company: [zennit](https://www.zennit.dev) (ecentic is a product of zennit)`,
  },
] as const;

const inlineOptions = {
  linkClassName: "text-primary underline-offset-2 hover:underline",
} as const;

const renderContent = (content: string): ReactNode => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const start = lines.findIndex((line) => line.startsWith("- "));

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: i is unique
            <p key={i} className="text-foreground-dimmed leading-relaxed">
              {renderInline(lines.join(" "), inlineOptions)}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: i is unique
          <div key={i} className="flex flex-col gap-2">
            {paragraphs.length > 0 && (
              <p className="text-foreground-dimmed leading-relaxed">
                {renderInline(paragraphs.join(" "), inlineOptions)}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {lists.map((line, j) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: j is unique
                  key={j}
                  className="flex gap-3 text-foreground-dimmed leading-relaxed"
                >
                  <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(line.slice(2), inlineOptions)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default () => (
  <main className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
      <Navbar />
    </div>

    <PageBanner
      eyebrow="Legal"
      title="Privacy"
      accent="Policy."
      meta="Last updated: August 5, 2026"
      description={
        "ecentic (“we”, “us”, “our”) is committed to protecting the privacy of merchants who use our e-commerce optimization platform. This policy explains what data we collect, how we use it, and your rights."
      }
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
        {renderContent(section.content)}
      </ContentPageSection>
    ))}

    <Footer stacked />
  </main>
);
