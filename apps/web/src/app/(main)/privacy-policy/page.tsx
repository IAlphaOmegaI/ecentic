import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Privacy Policy — écentic",
  description:
    "How écentic collects, uses, and protects your data when using our e-commerce optimization platform.",
};

const sections = [
  {
    title: "1. Information We Collect",
    content: `When you create an account, we collect your name, email address, and password (hashed, never stored in plain text).

When you connect a Shopify, WooCommerce, or custom feed store, we access and store:
- Product catalog data (titles, descriptions, prices, images, SKUs, handles, variant information)
- Store domain and name
- OAuth access tokens (encrypted at rest) required to read and write product data on your behalf

We do NOT access or store any customer personal data, order data, payment information, or shoppers' personally identifiable information from your connected stores. Our Shopify integration requests only the \`read_products\` and \`write_products\` scopes.`,
  },
  {
    title: "2. How We Use Your Data",
    content: `Your product catalog data is used exclusively to:
- Run AI agent simulations that evaluate how AI shopping models (GPT-4, Claude, Gemini) compare your products against competitors
- Generate optimization suggestions for product titles, descriptions, and structured data
- Publish approved optimizations back to your connected store via the platform API
- Generate your Universal Commerce Protocol (UCP) merchant profile
- Display analytics, win rates, and reports within your dashboard

We never sell, rent, or share your product data with third parties for their own marketing or commercial purposes.`,
  },
  {
    title: "3. Third-Party Services",
    content: `We use the following third-party services to operate écentic:
- **AI Model Providers** (OpenAI, Anthropic, Google) — Product data is sent to AI models during simulations. Data is transmitted via encrypted API calls and is not retained by providers beyond the API request lifecycle per their data processing agreements.
- **Sentry** — Error monitoring. May receive anonymized error context (no product data).
- **PostHog** — Product analytics. Receives anonymized usage events (page views, feature interactions). No product catalog data is sent.
- **Resend** — Transactional email delivery (verification codes, notifications). Receives only email addresses and message content.
- **UploadThing** — File storage for uploaded assets. Stores only files you explicitly upload.
- **Vercel** — Hosting infrastructure. Processes requests but does not independently store application data.`,
  },
  {
    title: "4. Data Storage & Security",
    content: `Your data is stored in a PostgreSQL database hosted on infrastructure with encryption at rest and in transit (TLS 1.2+). OAuth access tokens from Shopify and WooCommerce are stored encrypted.

We implement standard security practices including:
- HTTPS-only communication
- HMAC signature verification on all incoming Shopify webhooks
- CSRF protection via state/nonce parameters on OAuth flows
- Secure, httpOnly, sameSite cookies for session management
- Password hashing via industry-standard algorithms (bcrypt/argon2)`,
  },
  {
    title: "5. Data Retention & Deletion",
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
    title: "6. Cookies",
    content: `We use essential cookies only:
- **Session cookies** — Maintain your authenticated session
- **OAuth state cookies** — Short-lived (10 minutes) cookies used during Shopify OAuth flow to prevent CSRF attacks

We do not use advertising cookies or third-party tracking cookies.`,
  },
  {
    title: "7. Your Rights",
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
    title: "8. Changes to This Policy",
    content:
      "We may update this privacy policy from time to time. Material changes will be communicated via email to the address associated with your account at least 30 days before taking effect. Continued use of écentic after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "9. Contact",
    content: `For questions about this privacy policy or our data practices:
- Email: privacy@ecentic.com
- Company: Zennit (écentic is a product of Zennit)`,
  },
] as const;

export default () => (
  <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
    <Navbar />
    <header className="flex flex-col gap-4 pt-12">
      <h1 className="font-semibold text-4xl text-foreground">Privacy Policy</h1>
      <p className="text-foreground-dimmed">Last updated: March 15, 2026</p>
      <p className="text-foreground-dimmed text-lg">
        écentic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed
        to protecting the privacy of merchants who use our e-commerce
        optimization platform. This policy explains what data we collect, how we
        use it, and your rights.
      </p>
    </header>
    <div className="flex flex-col gap-10">
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="font-semibold text-2xl text-foreground">
            {section.title}
          </h2>
          <div className="whitespace-pre-line text-foreground-dimmed leading-relaxed">
            {section.content}
          </div>
        </section>
      ))}
    </div>
  </main>
);
