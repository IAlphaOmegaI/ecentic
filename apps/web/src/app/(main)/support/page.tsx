import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  BarChartIcon,
  BellIcon,
  CheckIcon,
  CircleBoltIcon,
  FaceSearchIcon,
  PhoneIcon,
  RobotIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
import { Plus } from "@/components/plus";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/headset.png";
import { ContentPageFooter, ContentPageLayout } from "../_components/content";

const description =
  "Get help with ecentic. Email support, a live walkthrough of your results, or a dedicated escalation path for Enterprise accounts.";

const assurances = [
  "Real humans on the other end",
  "Free scan walkthroughs",
  "Enterprise escalation path",
] as const;

type Channel = {
  icon: Icon;
  title: string;
  description: string;
  highlighted: boolean;
};

const channels: readonly Channel[] = [
  {
    icon: BellIcon,
    title: "Email support",
    description:
      "The fastest way to reach us for account, billing, or integration questions. Include your store URL so we can look things up before replying.",
    highlighted: true,
  },
  {
    icon: PhoneIcon,
    title: "Live walkthrough",
    description:
      "A 15-minute call where we run your products through the AI shopping models live and explain the results in plain language.",
    highlighted: false,
  },
  {
    icon: CircleBoltIcon,
    title: "Enterprise escalation",
    description:
      "Enterprise accounts get a named CSM, quarterly reviews, and a direct engineering escalation path.",
    highlighted: false,
  },
] as const;

const selfServe = [
  {
    href: "/how-it-works",
    icon: RobotIcon,
    name: "How it works",
    title: "Understand the simulate, diagnose, optimize loop",
    description:
      "The full explanation of what happens after you connect your store, step by step.",
    label: "Read how it works",
  },
  {
    href: "/features",
    icon: BarChartIcon,
    name: "Features",
    title: "See every tool in the platform",
    description:
      "Win-rate scores, competitor gap analysis, listing rewrites, agent traffic, UCP profiles, and rescans.",
    label: "Open features page",
  },
  {
    href: "/pricing",
    icon: FaceSearchIcon,
    name: "Pricing",
    title: "Compare plans, from the free scan up",
    description:
      "The free Scan, Pay-as-you-go, and the Compete and Dominate subscriptions explained side by side.",
    label: "See pricing",
  },
  {
    href: "/privacy-policy",
    icon: CheckIcon,
    name: "Privacy",
    title: "Check what data we store and never store",
    description:
      "Products-only scopes, no shopper personal data, essential cookies only, and how deletion works.",
    label: "Read the policy",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Support",
  description,
  path: "/support",
  keywords: [
    "ecentic support",
    "ecentic help",
    "contact ecentic",
    "AI ecommerce support",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Support",
      description,
      url: absoluteUrl("/support"),
      isPartOf: absoluteUrl("/"),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Support", path: "/support" },
    ]),
  ];

  return (
    <ContentPageLayout
      eyebrow="Support"
      title="We're here"
      accent="to help."
      description="Questions about your scan results, an integration, billing, or anything else: pick the channel that fits and we will take it from there."
      assurances={assurances}
      art={Art}
    >
      <JsonLd schemas={structuredData} />

      <section className="border-accent-foreground border-b">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="p-6 md:p-12">
            <span className="font-normal text-3xl text-primary">01</span>
            <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
              Pick your channel.
            </h2>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              Email for most things, a live call when you want the results
              explained, and a direct path for Enterprise teams.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
            <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            {channels.map((channel) => (
              <div
                key={channel.title}
                className={
                  channel.highlighted
                    ? "flex flex-col gap-2 bg-primary p-6 text-white md:p-8"
                    : "flex flex-col gap-2 bg-background-rich p-6 md:p-8"
                }
              >
                <channel.icon
                  className={
                    channel.highlighted
                      ? "size-8 text-white"
                      : "size-8 text-primary"
                  }
                />
                <h3 className="mt-2 font-body font-medium text-2xl">
                  {channel.title}
                </h3>
                <p
                  className={
                    channel.highlighted
                      ? "font-body font-light text-white"
                      : "font-body font-light text-foreground-dimmed"
                  }
                >
                  {channel.description}
                </p>
                <div className="mt-6 md:mt-auto">
                  {channel.title === "Email support" && (
                    <Button
                      color="accent"
                      className="w-fit"
                      render={<Link href="mailto:support@ecentic.ai" />}
                    >
                      support@ecentic.ai
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  )}
                  {channel.title === "Live walkthrough" && (
                    <BookCall color="primary" className="w-fit">
                      Book a call
                      <ArrowRightIcon className="size-4" />
                    </BookCall>
                  )}
                  {channel.title === "Enterprise escalation" && (
                    <Button
                      color="primary"
                      className="w-fit"
                      render={<Link href="/enterprise" />}
                    >
                      See Enterprise
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-accent-foreground border-b">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="p-6 md:p-12">
            <span className="font-normal text-3xl text-primary">02</span>
            <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
              Find it faster yourself.
            </h2>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              Most questions are already answered on these pages.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
            <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
            <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
            {selfServe.map((entry) => (
              <article
                key={entry.href}
                className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
              >
                <entry.icon
                  aria-label={entry.name}
                  className="size-7 text-primary"
                />
                <div className="flex flex-1 flex-col gap-3">
                  <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                    {entry.title}
                  </h3>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {entry.description}
                  </p>
                </div>
                <Button
                  color="accent"
                  className="w-fit"
                  render={<Link href={entry.href} />}
                >
                  {entry.label}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Run your free scan" }}
        secondary={{ href: "/", label: "Back to home" }}
        note="2-minute setup · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
