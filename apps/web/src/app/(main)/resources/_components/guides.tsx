import { ArrowRightIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";
import { AgentLogoCarousel } from "./agent-logo-carousel";

const guides = [
  {
    icon: SquareChartIcon,
    name: "Buyer's guide",
    title: "Best AI tools for ecommerce",
    description:
      "A category-based comparison of agent-commerce, content, personalization, search, and analytics tools so you can shortlist vendors by job to be done.",
    href: "/compare/best-ai-ecommerce-tools",
    label: "Read the guide",
  },
  {
    icon: FileIcon,
    name: "Long-form",
    title: "Blog",
    description:
      "Guides on structured data, agent traffic, catalog visibility, and the protocols shaping AI shopping, written for merchants and operators.",
    href: "/blog",
    label: "Browse articles",
  },
  {
    logo: shopify,
    name: "Shopify",
    title: "Shopify platform guide",
    description:
      "Install from the App Store, import your catalog, and publish approved listing updates back into Shopify.",
    href: "/platforms/shopify",
    label: "Open Shopify guide",
    buttonClassName:
      "border-[#5E8E3E] bg-[#5E8E3E] text-white shadow-none hover:bg-[#4E7A34]",
  },
  {
    logo: woocommerce,
    name: "WooCommerce",
    title: "WooCommerce platform guide",
    description:
      "Connect with REST API keys, run the same simulation loop, and publish improvements without changing platforms.",
    href: "/platforms/woocommerce",
    label: "Open WooCommerce guide",
    buttonClassName:
      "border-[#7F54B3] bg-[#7F54B3] text-white shadow-none hover:bg-[#6B4799]",
  },
] as const;

export const Guides = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">02</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Learn the system, then choose your depth.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Begin with the product loop, compare the market, or go straight to
            platform-specific implementation.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex h-full min-h-48 bg-background-dimmed p-6 md:min-h-0 md:p-10">
          <RevealItem className="flex h-full min-h-36 w-full flex-1 items-center justify-center">
            <AgentLogoCarousel />
          </RevealItem>
        </div>
        <div className="bg-background-rich p-6 md:p-10">
          <RevealItem className="flex flex-col items-start gap-3">
            <p className="font-medium text-primary text-sm">Product walkthrough</p>
            <h3 className="font-body font-medium text-3xl text-foreground">
              How it works
            </h3>
            <p className="max-w-xl font-light text-foreground-dimmed text-lg leading-relaxed">
              The simulate, diagnose, optimize loop, explained step by step for
              merchants who want to understand the product before they connect a
              store.
            </p>
            <Button
              color="primary"
              className="mt-2"
              render={<Link href="/how-it-works" />}
            >
              See the loop
              <ArrowRightIcon className="size-4" />
            </Button>
          </RevealItem>
        </div>
      </Reveal>

      <Reveal
        stagger={0.1}
        className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2"
      >
        {guides.map((guide) => (
          <article
            key={guide.title}
            className="h-full bg-background-rich p-6 md:p-8"
          >
            <RevealItem className="flex h-full flex-col gap-4">
              {"logo" in guide ? (
                <Image
                  src={guide.logo}
                  alt={guide.name}
                  className="h-12 w-auto self-start"
                />
              ) : (
                <guide.icon
                  aria-label={guide.name}
                  className="size-12 self-start text-primary"
                />
              )}
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                  {guide.title}
                </h3>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {guide.description}
                </p>
              </div>
              {"buttonClassName" in guide ? (
                <Button
                  className={cn("w-fit", guide.buttonClassName)}
                  render={<Link href={guide.href} />}
                >
                  {guide.label}
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  color="accent"
                  className="w-fit"
                  render={<Link href={guide.href} />}
                >
                  {guide.label}
                  <ArrowRightIcon className="size-4" />
                </Button>
              )}
            </RevealItem>
          </article>
        ))}
      </Reveal>
    </div>
  </section>
);
