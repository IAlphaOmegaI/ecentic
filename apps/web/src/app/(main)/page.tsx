"use cache";

import dynamic from "next/dynamic";
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
      <Hero />
      <BlindSpot />
      <Steps />
      <Features />
      <Suspense>
        <Comparison />
      </Suspense>
      <Pricing />
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
