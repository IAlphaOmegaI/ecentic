import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import Background from "@/public/images/blog.png";

export const Hero = () => (
  <section className="border-accent-foreground border-b p-4">
    <div className="relative size-full overflow-hidden rounded-lg bg-primary">
      <Image
        src={Background}
        alt=""
        aria-hidden
        loading="eager"
        className="absolute inset-y-0 right-0 h-full w-3/5 object-cover object-left opacity-25 brightness-0 invert"
      />
      <div className="relative z-10 mx-auto grid max-w-6xl border-accent-foreground border-x md:grid-cols-[8fr_5fr]">
        <div className="flex min-h-[34rem] flex-col justify-end px-8 pt-24 pb-14 md:min-h-[38rem] md:px-12 md:py-20">
          <h1 className="max-w-3xl text-balance font-semibold text-5xl text-white tracking-tight md:text-7xl">
            Free tools for the agent commerce shift.
          </h1>
          <p className="mt-6 max-w-xl text-pretty font-light text-lg text-white/80 leading-relaxed">
            Diagnose your catalog, validate your protocol surface, or inspect a
            live agent workflow before you commit.
          </p>
          <Button
            color="accent"
            className="mt-8 w-fit"
            render={<Link href="/sign-up" />}
          >
            Scan your store free
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        <div className="hidden border-white/20 border-l md:block" />
      </div>
    </div>
  </section>
);
