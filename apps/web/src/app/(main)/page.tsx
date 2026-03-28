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
      <Footer />
    </main>
  </SmoothScroll>
);
