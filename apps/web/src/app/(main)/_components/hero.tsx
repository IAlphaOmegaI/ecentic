import { ArrowRightIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import Background from "@/public/images/background.png";

export const Hero = () => (
  <div className="relative -left-[calc(50vw-50%)] h-screen w-screen p-3">
    <section className="relative flex size-full items-center justify-center overflow-hidden rounded-xl bg-primary">
      <Image src={Background} alt="Hero" className="size-full object-cover" priority sizes="100vw" />
      <div className="absolute bottom-6 left-6 z-20 flex max-w-[1200px] flex-col gap-4 text-white md:bottom-12 md:left-12">
        <h1 className="font-semibold text-4xl sm:text-5xl md:text-[76px]">
          40% of shoppers use AI agents to buy.{" "}
          <span className="underline">Be what they find.</span>
        </h1>
        <p className="text-sm sm:text-base md:text-2xl">
          écentic automatically optimizes your listings so that when a shopper
          asks an AI agent what to buy, your product is the answer.
        </p>
        <div className="mt-2 flex flex-col items-start gap-2">
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 bg-white px-6 py-3 text-primary transition-opacity hover:opacity-90 md:text-base"
          >
            Get your free diagnosis
            <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <span className="font-light text-sm text-white/60">
            No credit card. See results in 2 minutes.
          </span>
        </div>
      </div>
    </section>
  </div>
);
