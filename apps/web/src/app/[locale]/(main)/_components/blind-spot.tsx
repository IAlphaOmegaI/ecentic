import { EyeClosedIcon, RobotIcon, SearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Plus } from "@/components/plus";
import Product from "@/public/images/product.png";

const storyKeys = ["ask", "pick", "invisible"] as const;
const storyIcons = {
  ask: SearchIcon,
  pick: RobotIcon,
  invisible: EyeClosedIcon,
} as const;

const agentModels = [
  { model: "ChatGPT", logo: "/images/chatgpt.svg", score: 89 },
  { model: "Claude", logo: "/images/claude.svg", score: 82 },
  { model: "Gemini", logo: "/images/gemini.svg", score: 81 },
  { model: "Perplexity", logo: "/images/perplexity.svg", score: 85 },
] as const;

export const BlindSpot = async ({ locale }: BlindSpot.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section>
      <div className="relative border-accent-foreground border-y p-4 md:p-8">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="mb-3 flex items-center gap-2 md:mb-5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute size-full animate-ping rounded-full bg-primary opacity-40" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-light text-primary text-xl">
            {translate("blindSpot.eyebrow")}
          </span>
        </div>
        <h2 className="mb-3 max-w-3xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
          {translate("blindSpot.title")}
        </h2>
        <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
          {translate("blindSpot.description")}{" "}
          <span className="underline">
            <span className="text-primary">
              {translate("blindSpot.descriptionAccent")}
            </span>
          </span>
        </p>
      </div>
      <div className="relative grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {storyKeys.map((key, index) => {
          const Icon = storyIcons[key];

          return (
            <div
              key={key}
              className={`relative flex flex-col gap-3 border-accent-foreground border-b p-4 md:border-b-0 md:p-8 ${index < storyKeys.length - 1 ? "md:border-r" : ""}`}
            >
              {index < storyKeys.length - 1 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
              )}
              <div className="flex items-center gap-3">
                <span className="font-semibold text-5xl text-primary tabular-nums leading-none">
                  {index + 1}
                </span>
                <Icon className="size-9 text-primary" />
              </div>
              <h3 className="font-medium text-2xl text-foreground md:text-3xl">
                {translate(`blindSpot.story.${key}.title`)}
              </h3>
              <p className="font-light text-base text-foreground-dimmed md:text-lg">
                {translate(`blindSpot.story.${key}.description`)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
        <div className="flex flex-col items-center justify-center border-accent-foreground border-b p-4 md:border-r md:border-b-0">
          <p className="font-light text-primary text-xl">
            {translate("blindSpot.panels.humans.label")}
          </p>
          <Image src={Product} alt="Hero" className="w-full" />
          <div className="flex w-full flex-col">
            <h3 className="font-medium text-4xl text-foreground">
              {translate("blindSpot.panels.humans.productTitle")}
            </h3>
            <p className="mb-4 font-light text-foreground-dimmed text-xl">
              {translate("blindSpot.panels.humans.productDescription")}
            </p>
            <Button
              color="primary"
              type="button"
              className="w-full p-4 font-medium text-xl"
            >
              {translate("blindSpot.panels.humans.addToCart")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-accent-foreground border-b p-4 md:border-t-0 md:border-r md:border-b-0">
          <p className="font-light text-primary text-xl">
            {translate("blindSpot.panels.agentsNow.label")}
          </p>
          <p className="font-light font-mono text-primary text-xl">
            {"{"}
            <br />
            "product": <span className="text-green-400">"Earbuds"</span>,<br />
            "brand": <span className="text-green-400">"Pro Audio"</span>, <br />
            "price": <span className="text-amber-400">139.00</span>, <br />
            <span className="text-red-500 line-through">"battery_life"</span>:{" "}
            <span className="text-red-500">null</span>, <br />
            <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
            <br />
            <span className="text-red-500 line-through">"warranty"</span>:{" "}
            <span className="text-red-500">null</span>, <br />
            <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
            <br />
            "description":
            <span className="text-green-400">"Immerse yourself ..."</span>{" "}
            <br />
            {"}"}
          </p>
          <h1 className="text-center font-light text-2xl text-red-500">
            {translate("blindSpot.panels.agentsNow.result")}
          </h1>
        </div>

        <div className="flex flex-col justify-between p-4">
          <p className="text-center font-light text-primary text-xl">
            {translate("blindSpot.panels.agentsAfter.label")}
          </p>

          <div className="flex flex-col items-center pt-6 pb-2 text-center">
            <span className="font-semibold text-8xl text-primary tabular-nums leading-none">
              #1
            </span>
            <p className="mt-3 font-medium text-2xl text-foreground">
              {translate("blindSpot.panels.agentsAfter.productTitle")}
            </p>
            <p className="font-light text-base text-foreground-dimmed">
              {translate("blindSpot.panels.agentsAfter.productMeta")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {agentModels.map(({ model, logo, score }) => (
              <div key={model} className="flex items-center gap-4">
                <Image
                  src={logo}
                  alt={model}
                  width={32}
                  height={32}
                  className="shrink-0"
                />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-base text-foreground">
                      {model}
                    </span>
                    <span className="font-semibold text-lg text-primary tabular-nums">
                      {score}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-accent-foreground">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h1 className="text-center font-light text-2xl text-primary">
            {translate("blindSpot.panels.agentsAfter.result")}
          </h1>
        </div>
      </div>
      <div className="flex h-12 justify-center border-accent-foreground border-b bg-background-dimmed" />
      <div className="relative grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="col-span-2 p-4">
          <p className="font-light text-foreground-dimmed text-lg md:text-2xl">
            {translate("blindSpot.closing")}
          </p>
        </div>
        <div className="flex items-center p-6">
          <Button
            color="primary"
            type="button"
            className="mt-auto w-full"
            render={<Link href="/sign-up" />}
          >
            {translate("action.seeAiScoreFree")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export namespace BlindSpot {
  export type Props = {
    locale: Locale;
  };
}
