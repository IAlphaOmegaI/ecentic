import { ArrowRightIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { ItemCycle } from "@/app/[locale]/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { Link } from "@/i18n/navigation";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const agentLogos = [chatgpt, claude, gemini, perplexity] as const;

const guideMeta = [
  { icon: SquareChartIcon, href: "/blog/best-ecommerce-ai-platforms" },
  { icon: FileIcon, href: "/blog" },
  {
    logo: shopify,
    href: "/platforms/shopify",
    buttonClassName:
      "border-[#5E8E3E] bg-[#5E8E3E] text-white shadow-none hover:bg-[#4E7A34]",
  },
  {
    logo: woocommerce,
    href: "/platforms/woocommerce",
    buttonClassName:
      "border-[#7F54B3] bg-[#7F54B3] text-white shadow-none hover:bg-[#6B4799]",
  },
] as const;

export const Guides = async () => {
  const translate = await getTranslations("resources");
  const messages = await getMessages();
  const agents = messages.resources.guides.agents;
  const cards = messages.resources.guides.cards;

  const paths = agents.map((agent, index) => ({
    ...agent,
    logo: agentLogos[index],
  }));

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("guides.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("guides.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("guides.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="flex flex-col bg-background-dimmed md:min-h-0">
            <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
              <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                {translate("guides.agentsIntro")}
              </p>
            </RevealItem>
            <ItemCycle items={paths} />
          </div>

          <div className="flex h-full flex-col justify-between gap-6 bg-background-rich p-6 md:p-10">
            <RevealItem className="flex flex-col items-start gap-3">
              <p className="font-medium text-primary-text text-sm">
                {translate("guides.walkthrough.eyebrow")}
              </p>
              <h3 className="font-body font-medium text-3xl text-foreground">
                {translate("guides.walkthrough.title")}
              </h3>
              <p className="max-w-xl font-light text-foreground-dimmed text-lg leading-relaxed">
                {translate("guides.walkthrough.description")}
              </p>
            </RevealItem>
            <RevealItem>
              <Button
                color="primary"
                className="mt-2"
                render={<Link href="/how-it-works" />}
              >
                {translate("guides.walkthrough.action.primary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </RevealItem>
          </div>
        </Reveal>

        <Reveal
          stagger={0.1}
          className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2"
        >
          {cards.map((guide, index) => {
            const meta = guideMeta[index];
            if (!meta) return null;

            return (
              <article
                key={guide.title}
                className="h-full bg-background-rich p-6 md:p-8"
              >
                <RevealItem className="flex h-full flex-col gap-4">
                  {"logo" in meta ? (
                    <Image
                      src={meta.logo}
                      alt={guide.name}
                      className="h-12 w-auto self-start"
                    />
                  ) : (
                    <meta.icon
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
                  {"buttonClassName" in meta ? (
                    <Button
                      className={cn("w-fit", meta.buttonClassName)}
                      render={<Link href={meta.href} />}
                    >
                      {guide.action.primary}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      color="accent"
                      className="w-fit"
                      render={<Link href={meta.href} />}
                    >
                      {guide.action.primary}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  )}
                </RevealItem>
              </article>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
};
