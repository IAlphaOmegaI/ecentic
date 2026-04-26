import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { createMetadata } from "@/lib/seo";
import Background from "@/public/images/privacy-policy.png";
import { renderInline } from "../_components/rich-text";

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "How écentic collects, uses, and protects your data when using our e-commerce optimization platform.",
  path: "/privacy-policy",
});

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

For GDPR data subject requests (access, rectification, erasure, portability), contact privacy@ecentic.ai.`,
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

To exercise any of these rights, contact privacy@ecentic.ai.`,
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
- Email: privacy@ecentic.ai
- Company: [zennit](https://www.zennit.dev) (écentic is a product of zennit)`,
  },
] as const;

const inlineOptions = {
  linkClassName: "text-purple-700 underline-offset-2 hover:underline",
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

    <div className="border-accent-foreground border-b p-4">
      <div className="relative size-full rounded-lg bg-primary">
        <Image
          src={Background}
          alt="Privacy Policy"
          className="absolute aspect-auto h-full w-full object-contain object-right"
        />
        <div className="relative z-10 mx-auto max-w-6xl border-accent-foreground border-x px-8 pt-36 pb-16">
          <p className="mb-4 font-medium text-primary text-sm uppercase tracking-[0.2em]">
            Legal
          </p>
          <h1 className="font-semibold text-7xl text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-white">Last updated: March 15, 2026</p>
          <p className="mt-6 max-w-2xl text-lg text-white leading-relaxed">
            écentic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
            committed to protecting the privacy of merchants who use our
            e-commerce optimization platform. This policy explains what data we
            collect, how we use it, and your rights.
          </p>
        </div>
      </div>
    </div>

    {sections.map((section) => (
      <div key={section.number} className="border-accent-foreground border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <div className="flex flex-col bg-background-dimmed p-8">
            <span className="mt-auto font-normal text-2xl text-primary">
              {section.number}
            </span>
            <h2 className="text-4xl text-foreground leading-snug">
              {section.title}
            </h2>
          </div>
          <div className="bg-background p-8">
            {renderContent(section.content)}
          </div>
        </div>
      </div>
    ))}

    <div className="border-accent-foreground border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between border-accent-foreground border-x px-8 py-8">
        <Button variant="outline" color="accent" render={<Link href="/" />}>
          <ArrowRightIcon className="size-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to home
        </Button>
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
