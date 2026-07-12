import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import Background from "@/public/images/blog.png";
import chatgpt from "@/public/images/chatgpt.svg";
import shopify from "@/public/images/shopify.svg";
import ucp from "@/public/images/ucp.png";
import woocommerce from "@/public/images/woocommerce.svg";

const assurances = [
  "No credit card required",
  "No account for most tools",
  "Built for merchants and builders",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b p-4">
    <div className="relative size-full overflow-hidden rounded-lg bg-primary">
      <Image
        src={Background}
        alt=""
        aria-hidden
        className="absolute aspect-auto h-full w-full object-contain object-right opacity-30 brightness-0 invert"
      />
      <div className="relative z-10 mx-auto max-w-6xl border-accent-foreground border-x px-8 pt-36 pb-16">
        <p className="mb-4 font-medium text-sm text-white/70 uppercase tracking-[0.2em]">
          Resources
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
          Free tools to get agent-ready{" "}
          <span className="text-white/80">before you commit.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white leading-relaxed md:text-lg">
          Run a win-rate scan, validate your Universal Commerce Profile, test a
          live storefront with an AI shopping agent, and read the guides we
          publish for merchants evaluating agent commerce.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            color="accent"
            className="w-full px-5 py-2.5 text-base sm:w-auto"
            render={<Link href="/sign-up" />}
          >
            Scan your store free
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            color="primary"
            variant="outline"
            className="w-full border-white/20 bg-white/10 px-5 py-2.5 text-base text-white hover:bg-white/20 sm:w-auto"
            render={<Link href="/ucp-validator" />}
          >
            <Image src={ucp} alt="" className="h-4 w-auto" />
            Validate UCP
          </Button>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {assurances.map((assurance) => (
            <li
              key={assurance}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white"
            >
              <CheckIcon className="size-3.5 text-white/80" />
              {assurance}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4">
          <p className="w-full font-medium text-white/70 text-xs uppercase tracking-[0.18em] sm:w-auto sm:flex-1">
            Works with
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white">
              <Image src={shopify} alt="" className="size-4" />
              Shopify
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white">
              <Image src={woocommerce} alt="" className="h-3.5 w-auto" />
              WooCommerce
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white">
              <Image src={ucp} alt="" className="h-4 w-auto" />
              UCP
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white">
              <Image src={chatgpt} alt="" className="size-4" />
              AI agents
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
