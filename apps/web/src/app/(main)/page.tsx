"use cache";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BlindSpot } from "./_components/blind-spot";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { Pricing } from "./_components/pricing";
import { SmoothScroll } from "./_components/smooth-scroll";
import { Steps } from "./_components/steps";

const Comparison = dynamic(() =>
  import("./_components/comparison").then((m) => m.Comparison),
);

export default async () => (
  <SmoothScroll>
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 border-accent-foreground border-x md:gap-12">
      <Navbar />
      <section
        aria-labelledby="home-h1"
        className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pt-8 text-primary md:px-10"
      >
        <h1
          id="home-h1"
          className="font-body font-semibold text-3xl md:text-4xl"
        >
          e-commerce optimization for the AI agent economy
        </h1>
        <h2 className="font-body font-medium text-xl md:text-2xl">
          Make every product easier for AI shopping agents to recommend
        </h2>
        <p className="font-body text-base text-primary/80 leading-relaxed">
          écentic helps brands understand how AI shopping agents evaluate
          product pages before they recommend an item to shoppers. Instead of
          guessing why one listing wins and another loses, teams can simulate
          how modern AI systems compare product titles, descriptions, pricing,
          trust signals, and competitor alternatives. This creates a repeatable
          process for improving product discovery, recommendation quality, and
          conversion outcomes across channels where AI assistants now influence
          purchase decisions.
        </p>
        <p className="font-body text-base text-primary/80 leading-relaxed">
          The platform combines simulation, diagnostics, and optimization in one
          workflow. Teams can connect stores, review product intelligence, track
          competitor gaps, and prioritize the highest-impact listing updates.
          These updates are built for real-world commerce teams that need clear
          actions, measurable progress, and fast feedback loops. As agent-driven
          shopping grows, this approach gives merchants a practical system to
          keep listings competitive and increase win rate in AI-assisted carts.
        </p>
        <p className="font-body text-base text-primary/80 leading-relaxed">
          Start in onboarding, connect your catalog, and move into dashboards
          for products, competitors, reports, and optimization opportunities.
        </p>
        <div className="flex flex-wrap items-center gap-4 font-medium text-sm">
          <Link
            href="/onboarding/connect"
            className="underline underline-offset-4"
          >
            Start onboarding
          </Link>
          <Link
            href="/dashboard/products"
            className="underline underline-offset-4"
          >
            Explore products dashboard
          </Link>
          <Link href="/privacy-policy" className="underline underline-offset-4">
            Read privacy policy
          </Link>
          <a
            href="https://www.shopify.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Learn about Shopify
          </a>
        </div>
      </section>
      <Hero />
      <BlindSpot />
      <Steps />
      <Features />
      <Suspense>
        <Comparison />
      </Suspense>
      <Pricing />
      <Footer />
    </main>
  </SmoothScroll>
);
