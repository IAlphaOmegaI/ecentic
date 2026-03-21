"use cache";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BlindSpot } from "./_components/blind-spot";
import { Comparison } from "./_components/comparison";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { Pricing } from "./_components/pricing";
import { Steps } from "./_components/steps";
import { Suspense } from "react";

export default async () => (
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
);
