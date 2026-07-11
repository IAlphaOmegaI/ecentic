import type { Icon } from "@zenncore/icons";
import {
  CheckCircleIcon,
  CheckIcon,
  ShareIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { createMetadata } from "@/lib/seo";
import { ContentPageSection } from "../_components/content";
import { renderInline } from "../_components/rich-text";

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "How ecentic collects, uses, and protects your data when using our e-commerce optimization platform.",
  path: "/privacy-policy",
});

const assurances = [
  "No shopper personal data",
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
      "Account basics and the product catalog data you connect: titles, descriptions, prices, images, SKUs.",
  },
  {
    icon: XCircleIcon,
    title: "What we never touch",
    description:
      "Shopper personal data, orders, and payment information. Our integrations use products-only scopes.",
  },
  {
    icon: ShareIcon,
    title: "Where data goes",
    description:
      "To AI providers during simulations only, over encrypted calls. Never sold or shared for marketing.",
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
- OAuth access tokens (encrypted at rest) required to read and write product data on your behalf

We do NOT access or store any customer personal data, order data, payment information, or shoppers' personally identifiable information from your connected stores. Our Shopify integration requests only the \`read_products\` and \`write_products\` scopes.`,
  },
  {
    title: "How We Use Your Data",
    number: "02",
    content: `Your product catalog data is used exclusively to:
- Run AI agent simulations that evaluate how AI shopping models (GPT-4, Claude, Gemini, Perplexity) compare your products against competitors
- Generate optimization suggestions for product titles, descriptions, and structured data
- Publish approved optimizations back to your connected store via the platform API
- Generate your Universal Commerce Protocol (UCP) merchant profile
- Display analytics, win rates, and reports within your dashboard

We never sell, rent, or share your product data with third parties for their own marketing or commercial purposes.`,
  },
  {
    title: "Third-Party Services",
    number: "03",
    content: `We use the following third-party services to operate ecentic:
- **AI Model Providers** (OpenAI, Anthropic, Google): Product data is sent to AI models during simulations. Data is transmitted via encrypted API calls and is not retained by providers beyond the API request lifecycle per their data processing agreements.
- **Sentry**: Error monitoring. May receive anonymized error context (no product data).
- **PostHog**: Product analytics. Receives anonymized usage events (page views, feature interactions). No product catalog data is sent.
- **Resend**: Transactional email delivery (verification codes, notifications). Receives only email addresses and message content.
- **UploadThing**: File storage for uploaded assets. Stores only files you explicitly upload.
- **Vercel**: Hosting infrastructure. Processes requests but does not independently store application data.`,
  },
  {
    title: "Data Storage & Security",
    number: "04",
    content: `Your data is stored in a PostgreSQL database hosted on infrastructure with encryption at rest and in transit (TLS 1.2+). OAuth access tokens from Shopify and WooCommerce are stored encrypted.

We implement standard security practices including:
- HTTPS-only communication
- HMAC signature verification on all incoming Shopify webhooks
- CSRF protection via state/nonce parameters on OAuth flows
- Secure, httpOnly, sameSite cookies for session management
- Password hashing via industry-standard algorithms (bcrypt/argon2)`,
  },
  {
    title: "Data Retention & Deletion",
    number: "05",
    content: `We retain your data for as long as your account is active. When you disconnect a store, the associated access tokens are immediately deleted. Product data imported from that store is retained for your simulation history unless you explicitly request deletion.

When you delete your account, all associated data is permanently deleted, including:
- Your user profile and authentication credentials
- All connected store records and access tokens
- All imported product data
- All simulation results, optimization history, and reports
- Your UCP merchant profile

When a Shopify merchant uninstalls the ecentic app, we receive a \`shop/redact\` webhook and automatically delete all store data, products, and associated records for that shop.

For GDPR data subject requests (access, rectification, erasure, portability), contact privacy@ecentic.ai.`,
  },
  {
    title: "Cookies",
    number: "06",
    content: `We use essential cookies only:
- **Session cookies**: Maintain your authenticated session
- **OAuth state cookies**: Short-lived (10 minutes) cookies used during Shopify OAuth flow to prevent CSRF attacks

We do not use advertising cookies or third-party tracking cookies.`,
  },
  {
    title: "Your Rights",
    number: "07",
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
    number: "08",
    content:
      "We may update this privacy policy from time to time. Material changes will be communicated via email to the address associated with your account at least 30 days before taking effect. Continued use of ecentic after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact",
    number: "09",
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

    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <div className="px-8 pt-36 pb-16">
          <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
            Legal
          </p>
          <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
            Privacy <span className="text-primary">Policy.</span>
          </h1>
          <p className="mt-2 text-foreground-dimmed text-sm">
            Last updated: March 15, 2026
          </p>
          <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
            ecentic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
            committed to protecting the privacy of merchants who use our
            e-commerce optimization platform. This policy explains what data we
            collect, how we use it, and your rights.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {assurances.map((assurance) => (
              <li
                key={assurance}
                className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background-rich px-3 py-1 text-foreground text-sm"
              >
                <CheckIcon className="size-3.5 text-primary" />
                {assurance}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {summary.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 bg-background-dimmed p-6"
            >
              <item.icon className="size-7 text-primary" />
              <h2 className="mt-2 font-body font-medium text-foreground text-xl">
                {item.title}
              </h2>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

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
