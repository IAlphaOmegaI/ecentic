import { Navbar } from "@/components/navbar";
import { BlindSpot } from "./_components/blind-spot";
import { Footer } from "@/components/footer";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { Pricing } from "./_components/pricing";
import { Steps } from "./_components/steps";

export default () => (
  <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 border-accent-foreground border-x md:gap-12">
    <Navbar />
    <Hero />
    <BlindSpot />
    <Steps />
    <Features />
    {/* <Comparison /> */}
    <Pricing />
    <Footer />
  </main>
);
