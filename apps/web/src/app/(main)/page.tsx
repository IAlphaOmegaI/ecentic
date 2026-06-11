"use cache";

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  absoluteUrl,
  createMetadata,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo";
import { BlindSpot } from "./_components/blind-spot";
import { Booking } from "./_components/booking";
import { DiscoveryShift } from "./_components/discovery-shift";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { PartnersStrip } from "./_components/partners-strip";
import { SmoothScroll } from "./_components/smooth-scroll";
import { Steps } from "./_components/steps";
import {
  aggregateRating,
  reviewSchemas,
  Testimonials,
} from "./_components/testimonials";
import { UCPCallout } from "./_components/ucp-callout";
import { WhyNow } from "./_components/why-now";

const Comparison = dynamic(() =>
  import("./_components/comparison").then((m) => m.Comparison),
);

const description =
  "AI ecommerce platform for product listing optimization, competitor analysis, and AI shopping visibility. Simulate decisions and improve win rate.";

export const metadata: Metadata = createMetadata({
  title: "écentic — Win Every AI Shopping Agent's Cart",
  description,
  path: "/",
  keywords: [
    "AI ecommerce tools",
    "AI ecommerce platform",
    "AI product listing optimization",
    "AI for Shopify stores",
    "AI shopping agents",
  ],
});

export default async () => (
  <SmoothScroll>
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 border-accent-foreground border-x md:gap-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            organizationSchema,
            websiteSchema,
            {
              ...softwareApplicationSchema,
              aggregateRating: {
                "@type": "AggregateRating",
                ...aggregateRating,
              },
              review: reviewSchemas,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "AI Ecommerce Platform for Product Visibility",
              description,
              url: absoluteUrl("/"),
              about: [
                "AI ecommerce platform",
                "product listing optimization",
                "AI shopping agents",
              ],
            },
          ]),
        }}
      />
      <Navbar />
      <Hero />
      <PartnersStrip />
      <DiscoveryShift />
      <BlindSpot />
      <WhyNow />
      {/* <AgentTrafficLive /> */}
      <Steps />
      <Features />
      <UCPCallout />
      <Suspense>
        <Comparison />
      </Suspense>
      {/* <Pricing /> */}
      <Testimonials />
      <Booking />
      {/* <DiscoveryPaths /> */}
      <section aria-label="About écentic" className="sr-only">
        <h2>Make every product easier for AI shopping agents to recommend</h2>
        <p>
          écentic helps brands understand how AI shopping agents evaluate
          product pages before they recommend an item to shoppers. Instead of
          guessing why one listing wins and another loses, teams can simulate
          how modern AI systems compare product titles, descriptions, pricing,
          trust signals, and competitor alternatives. This creates a repeatable
          process for improving product discovery, recommendation quality, and
          conversion outcomes across channels where AI assistants now influence
          purchase decisions.
        </p>
        <p>
          The platform combines simulation, diagnostics, and optimization in one
          workflow. Teams can connect stores, review product intelligence, track
          competitor gaps, and prioritize the highest-impact listing updates.
          These updates are built for real-world commerce teams that need clear
          actions, measurable progress, and fast feedback loops. As agent-driven
          shopping grows, this approach gives merchants a practical system to
          keep listings competitive and increase win rate in AI-assisted carts.
        </p>
        <p>
          Start in onboarding, connect your catalog, and move into dashboards
          for products, competitors, reports, and optimization opportunities.
        </p>
      </section>
      <Footer />
    </main>
  </SmoothScroll>
);
