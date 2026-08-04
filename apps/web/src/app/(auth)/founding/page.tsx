import { unwrapResult } from "@zenncore/utils";
import * as motion from "motion/react-client";
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Fade } from "@/lib/animations";
import * as PromoClaim from "@/server/app/promo-claim";
import { Environment } from "@/server/utils/environment";
import { PROMOS, type PromoKey } from "@/server/utils/stripe";
import { FoundingForm } from "./_components/founding-form";

const key = "founding" satisfies PromoKey;
const promo = PROMOS[key];

const price = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US")}`;

const points = [
  `Compete at ${price(promo.claimedCents)}/mo for your first ${promo.months} months, then ${price(promo.listCents)}`,
  "Daily agent simulations across GPT-4, Claude, Gemini, and Perplexity",
  "Competitor battlecards and optimization suggestions for up to 100 products",
];

export const metadata: Metadata = {
  title: "Founding offer — ecentic",
};

const SeatSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="h-10 w-full animate-pulse bg-foreground/10" />
    <div className="mt-1 h-10 w-full animate-pulse bg-foreground/10" />
  </div>
);

/**
 * Reading the seat's state is a database round-trip, so it streams in behind the
 * shell rather than holding the page. The answer is a starting point, not the
 * verdict — `claim` re-checks under the unique index, so a seat taken between
 * this render and the submit still resolves correctly.
 */
const Seat = async () => {
  const open = await unwrapResult(
    PromoClaim.isOpen(Environment.SERVER, { promo: key }),
  );

  return (
    <FoundingForm
      promo={key}
      claimedPrice={price(promo.claimedCents)}
      months={promo.months}
      open={open}
    />
  );
};

export default () => (
  <div className="flex h-screen overflow-hidden bg-primary">
    <Onboarding
      points={points}
      headline={
        <>
          One seat.
          <br />
          First email.
        </>
      }
    />
    <motion.div
      className="flex flex-1 flex-col overflow-hidden bg-background"
      variants={Fade.Right}
      initial="hidden"
      animate="visible"
    >
      <Motion.Stagger
        stagger={0.08}
        delay={0.1}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <Motion.Item className="w-full border-accent-foreground border-b px-8">
          <div className="relative flex flex-col gap-4 border-accent-foreground border-x p-6">
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="lg:hidden">
              <Image
                src="/images/trademark.svg"
                alt="ecentic"
                width={100}
                height={28}
                className="h-auto w-24"
                loading="eager"
              />
            </div>
            <div>
              <h2 className="font-medium text-4xl text-foreground">
                {price(promo.claimedCents)}/mo for {promo.months} months
              </h2>
              <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                Compete, normally {price(promo.listCents)}/mo. Claim it with
                your email — only the first one counts.
              </p>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
          <div className="relative h-full border-accent-foreground border-x p-6">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<SeatSkeleton />}>
              <Seat />
            </Suspense>
          </div>
        </Motion.Item>

        <Motion.Item className="w-full px-8">
          <div className="relative flex flex-row items-center border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            The discount applies to the first {promo.months} invoices on Compete
            and follows the email you claim with. Cancel any time.
          </div>
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  </div>
);
