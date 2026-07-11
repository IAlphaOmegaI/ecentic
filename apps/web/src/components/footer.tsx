import { InstagramIcon, LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import Link from "next/link";
import { InstallCta } from "@/app/(main)/_components/install-cta";
import WordMark from "@/public/images/wordmark.svg";
import { Plus } from "./plus";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/features/product-listings", label: "Product Listings" },
    ],
  },
  {
    title: "Platforms",
    links: [
      { href: "/platforms/shopify", label: "Shopify" },
      { href: "/platforms/woocommerce", label: "WooCommerce" },
      { href: "/enterprise", label: "Enterprise" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Resources" },
      { href: "/blog", label: "Blog" },
      { href: "/compare/best-ai-ecommerce-tools", label: "Compare" },
      { href: "/ucp-validator", label: "UCP Validator" },
      { href: "/ucp-playground", label: "UCP Playground" },
      { href: "/demo", label: "Book a demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/support", label: "Support" },
      { href: "/privacy-policy", label: "Privacy Policy" },
    ],
  },
] as const;

const socials = [
  {
    href: "https://x.com/ecentic_ai",
    icon: <XTwitterIcon className="size-5" fill="currentColor" />,
    label: "X",
  },
  {
    href: "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    icon: <LinkedinIcon className="size-5" fill="currentColor" />,
    label: "LinkedIn",
  },
  {
    href: "https://www.instagram.com/ecentic.ai/",
    icon: <InstagramIcon className="size-5" fill="currentColor" />,
    label: "Instagram",
  },
] as const;

export const Footer = ({ stacked = false }: Footer.Props) => (
  <section className="relative -left-[calc(50vw-50%)] w-screen">
    <div
      className={cn(
        "relative isolate mx-auto max-w-6xl border-accent-foreground",
        stacked ? "border-x" : "border-t",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[500px] bg-radial-[at_50%_100%] from-primary/20 via-primary/5 to-transparent"
      />
      {!stacked && (
        <>
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        </>
      )}

      {/* CTA band */}
      <div className="relative border-accent-foreground border-b p-6 md:p-12">
        <span className="font-light text-primary text-xl">
          Get picked by AI
        </span>
        <h2 className="mt-4 max-w-4xl font-body font-medium text-3xl text-foreground leading-tight tracking-tight md:text-5xl">
          Ready to be the product agents recommend?
        </h2>
        <p className="mt-6 max-w-xl font-light text-foreground-dimmed text-lg">
          Install free on Shopify or WooCommerce and see your AI score in
          minutes.
        </p>
        <InstallCta className="mt-8" />
      </div>

      {/* Link grid */}
      <div className="relative grid border-accent-foreground border-b md:grid-cols-12">
        <div className="flex flex-col gap-5 border-accent-foreground border-b p-6 md:col-span-4 md:border-r md:border-b-0 md:p-8">
          <Image
            src={WordMark}
            alt="ecentic"
            className="h-5 w-auto self-start"
          />
          <p className="max-w-xs font-light text-base text-foreground-dimmed">
            The optimization platform for the AI agent economy. Simulate,
            diagnose, and win every AI shopping agent's recommendation.
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ href, icon, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-10 items-center justify-center border border-accent-foreground bg-background text-foreground-dimmed transition-colors hover:border-primary hover:text-primary"
              >
                {icon}
              </a>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-4">
            <span className="relative flex size-3 shrink-0 items-center justify-center">
              <span className="absolute size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative size-1.5 rounded-full bg-success" />
            </span>
            <span className="font-light text-foreground-dimmed text-sm">
              Built for the agent economy
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:col-span-8 md:grid-cols-4">
          {columns.map((column, index) => (
            <nav
              key={column.title}
              className={`relative flex flex-col gap-4 border-accent-foreground p-6 md:border-b-0 md:p-8 ${
                index < 2 ? "border-b" : ""
              } ${index % 2 === 0 ? "border-r" : "md:border-r"} ${
                index === columns.length - 1 ? "md:border-r-0" : ""
              }`}
            >
              <span className="font-medium text-foreground-dimmed text-xs uppercase tracking-widest">
                {column.title}
              </span>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-light text-base text-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative flex flex-col items-center justify-between gap-3 p-6 md:flex-row md:px-8">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <p className="font-light text-foreground-dimmed text-sm">
          © 2026 ecentic. All rights reserved.
        </p>
        <p className="font-light text-foreground-dimmed text-sm">
          Made for merchants who refuse to be invisible to AI.
        </p>
      </div>
    </div>
  </section>
);

export namespace Footer {
  export type Props = {
    stacked?: boolean;
  };
}
