import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import woocommerce from "@/public/images/woocommerce.svg";

const assurances = [
  "No platform migration",
  "Approved updates publish via the REST API",
  "See your free score first",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <div className="px-8 pt-36 pb-16">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7F54B3]/40 bg-[#7F54B3]/10 px-3 py-1.5 font-medium text-foreground text-sm">
          <Image src={woocommerce} alt="" className="size-4" />
          Built for WooCommerce
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
          AI for WooCommerce stores that need{" "}
          <span className="text-primary">cleaner product workflows.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
          Import your catalog, see where listings lose to competitors in
          AI-mediated comparisons, and publish approved improvements back into
          WooCommerce without changing platforms.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            color="primary"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/sign-up?platform=woocommerce" />}
          >
            <Image src={woocommerce} alt="" className="size-5" />
            Connect WooCommerce
          </Button>
          <Button
            color="accent"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/how-it-works" />}
          >
            See how it works
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {assurances.map((assurance) => (
            <li
              key={assurance}
              className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background-rich px-3 py-1 text-foreground text-sm"
            >
              <CheckIcon className="size-3.5 text-primary" />
              {assurance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
