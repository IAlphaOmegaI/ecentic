import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { ArrowRightIcon } from "@zenncore/icons";

export const metadata: Metadata = {
  title: "Privacy Policy — écentic",
  description:
    "How écentic collects, uses, and protects your data when using our e-commerce optimization platform.",
};

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
- Run AI agent simulations that evaluate how AI shopping models (GPT-4, Claude, Gemini) compare your products against competitors
- Generate optimization suggestions for product titles, descriptions, and structured data
- Publish approved optimizations back to your connected store via the platform API
- Generate your Universal Commerce Protocol (UCP) merchant profile
- Display analytics, win rates, and reports within your dashboard

We never sell, rent, or share your product data with third parties for their own marketing or commercial purposes.`,
  },
  {
    title: "Third-Party Services",
    number: "03",
    content: `We use the following third-party services to operate écentic:
- **AI Model Providers** (OpenAI, Anthropic, Google) — Product data is sent to AI models during simulations. Data is transmitted via encrypted API calls and is not retained by providers beyond the API request lifecycle per their data processing agreements.
- **Sentry** — Error monitoring. May receive anonymized error context (no product data).
- **PostHog** — Product analytics. Receives anonymized usage events (page views, feature interactions). No product catalog data is sent.
- **Resend** — Transactional email delivery (verification codes, notifications). Receives only email addresses and message content.
- **UploadThing** — File storage for uploaded assets. Stores only files you explicitly upload.
- **Vercel** — Hosting infrastructure. Processes requests but does not independently store application data.`,
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

When a Shopify merchant uninstalls the écentic app, we receive a \`shop/redact\` webhook and automatically delete all store data, products, and associated records for that shop.

For GDPR data subject requests (access, rectification, erasure, portability), contact privacy@ecentic.com.`,
  },
  {
    title: "Cookies",
    number: "06",
    content: `We use essential cookies only:
- **Session cookies** — Maintain your authenticated session
- **OAuth state cookies** — Short-lived (10 minutes) cookies used during Shopify OAuth flow to prevent CSRF attacks

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

To exercise any of these rights, contact privacy@ecentic.com.`,
  },
  {
    title: "Changes to This Policy",
    number: "08",
    content:
      "We may update this privacy policy from time to time. Material changes will be communicated via email to the address associated with your account at least 30 days before taking effect. Continued use of écentic after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact",
    number: "09",
    content: `For questions about this privacy policy or our data practices:
- Email: privacy@ecentic.com
- Company: [zennit](https://www.zennit.dev) (écentic is a product of zennit)`,
  },
] as const;

const renderInline = (text: string): ReactNode[] =>
  text.split(/\*\*(.*?)\*\*/g).flatMap((part, index) => {
    if (index % 2 === 1) {
      return [
        <strong key={index} className="font-medium text-foreground">
          {part}
        </strong>,
      ];
    }
    return part
      .split(/(\[[^\]]+\]\([^)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
      .map((segment, segmentIndex) => {
        const mdLink = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (mdLink) {
          return (
            <a
              key={`${index}-${segmentIndex}`}
              href={mdLink[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 underline-offset-2 hover:underline"
            >
              {mdLink[1]}
            </a>
          );
        }
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(segment)) {
          return (
            <a
              key={`${index}-${segmentIndex}`}
              href={`mailto:${segment}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {segment}
            </a>
          );
        }
        return segment;
      });
  });

const renderContent = (content: string): ReactNode => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const listStart = lines.findIndex((line) => line.startsWith("- "));

        if (listStart === -1) {
          return (
            <p
              key={blockIndex}
              className="text-foreground-dimmed leading-relaxed"
            >
              {renderInline(lines.join(" "))}
            </p>
          );
        }

        const paraLines = lines.slice(0, listStart);
        const listLines = lines.slice(listStart);

        return (
          <div key={blockIndex} className="flex flex-col gap-3">
            {paraLines.length > 0 && (
              <p className="text-foreground-dimmed leading-relaxed">
                {renderInline(paraLines.join(" "))}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {listLines.map((line, lineIndex) => (
                <li
                  key={lineIndex}
                  className="flex gap-3 text-foreground-dimmed leading-relaxed"
                >
                  <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(line.slice(2))}</span>
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
    <div className="mx-auto w-full max-w-6xl border-x border-accent-foreground">
      <Navbar />
    </div>

    {/* Hero */}
    <div className="border-b border-accent-foreground">
      <div className="mx-auto max-w-6xl border-x border-accent-foreground px-8 pb-16 pt-36">
        <p className="mb-4 font-medium text-primary text-sm uppercase tracking-[0.2em]">
          Legal
        </p>
        <h1 className="font-semibold text-7xl text-foreground tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-foreground-dimmed text-sm">
          Last updated: March 15, 2026
        </p>
        <p className="mt-6 max-w-2xl text-foreground-dimmed text-lg leading-relaxed">
          écentic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
          committed to protecting the privacy of merchants who use our
          e-commerce optimization platform. This policy explains what data we
          collect, how we use it, and your rights.
        </p>
      </div>
    </div>

    {/* Sections */}
    {sections.map((section) => (
      <div key={section.number} className="border-b border-accent-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px border-x border-accent-foreground bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <div className="flex flex-col bg-background px-8 py-10">
            <span className="font-normal text-primary text-2xl">
              {section.number}
            </span>
            <h2 className="font-semibold text-foreground text-2xl leading-snug">
              {section.title}
            </h2>
          </div>
          <div className="bg-background px-8 py-10">
            {renderContent(section.content)}
          </div>
        </div>
      </div>
    ))}

    {/* Footer row */}
    <div className="border-b border-accent-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between border-x border-accent-foreground px-8 py-8">
        <Link
          href="/"
          className="group flex items-center gap-2 font-light text-foreground-dimmed text-sm transition-colors hover:text-foreground"
        >
          <ArrowRightIcon className="size-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to home
        </Link>
        <p className="text-foreground-dimmed text-sm">
          © 2026{" "}
          <a
            href="https://www.zennit.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 underline-offset-2 hover:underline"
          >
            zennit
          </a>
          . All rights reserved.
        </p>
      </div>
    </div>
  </main>
);
