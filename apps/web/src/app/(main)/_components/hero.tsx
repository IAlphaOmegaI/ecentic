import Link from "next/link";
import Image from "next/image";
import Background from "@/public/images/background.png";

export const Hero = () => (
  <div className="relative -left-[calc(50vw-50%)] -z-1 h-screen w-screen p-3">
    <section className="relative flex size-full items-center justify-center overflow-hidden rounded-xl bg-primary">
      <Image src={Background} alt="Hero" className="size-full object-cover" />
      <div className="absolute bottom-6 left-6 flex max-w-[800px] flex-col gap-4 text-white md:bottom-12 md:left-12">
        <h1 className="font-semibold text-4xl sm:text-5xl md:text-[76px]">
          40% of shoppers use AI agents to buy. Be what they find.
        </h1>
        <p className="text-sm sm:text-base md:text-2xl">
          écentic automatically optimizes your listings so that when a shopper
          asks an AI agent what to buy, your product is the answer.
        </p>
        <div className="mt-2 flex flex-col items-start gap-2">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-white px-6 py-3 font-semibold text-primary text-sm transition-opacity hover:opacity-90 md:text-base"
          >
            Get your free diagnosis
            <span className="font-normal text-primary">→</span>
          </Link>
          <span className="font-light text-white/60 text-sm">
            No credit card. See results in 2 minutes.
          </span>
        </div>
      </div>
    </section>
  </div>
);
