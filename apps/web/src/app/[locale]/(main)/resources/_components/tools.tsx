import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { getMessages, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import enMessages from "../../../../../../messages/en.json";
import { PlaygroundArt, ScanArt, UcpArt } from "./resource-art";

type ToolItem = (typeof enMessages)["resources"]["tools"]["items"][number];

type Tool = ToolItem & {
  href: string;
  highlighted?: boolean;
  art: "scan" | "ucp" | "playground";
};

const toolHrefs = ["/sign-up", "/ucp-validator", "/ucp-playground"] as const;
const toolArt = ["scan", "ucp", "playground"] as const;

const ToolArt = ({
  art,
  className,
}: {
  art: Tool["art"];
  className?: string;
}) => {
  switch (art) {
    case "scan":
      return <ScanArt className={className} />;
    case "ucp":
      return <UcpArt className={className} />;
    case "playground":
      return <PlaygroundArt className={className} />;
    default: {
      const exhaustive: never = art;
      return exhaustive;
    }
  }
};

export const Tools = async () => {
  const translate = await getTranslations("resources");
  const messages = await getMessages();
  const items = messages.resources.tools.items;

  const tools = items.map((item, index) => ({
    ...item,
    href: toolHrefs[index] ?? "/sign-up",
    highlighted: index === 0,
    art: toolArt[index] ?? "scan",
    features: item.features.map((feature) =>
      feature.includes("{count}")
        ? feature.replace("{count}", String(ANONYMOUS_MESSAGE_LIMIT))
        : feature,
    ),
  }));

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("tools.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("tools.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("tools.description")}
            </p>
          </RevealItem>
        </Reveal>

        <div className="relative flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {tools.map((tool, index) => {
            const reversed = index % 2 === 1;

            return (
              <Reveal
                key={tool.title}
                className="grid grid-cols-1 gap-px md:grid-cols-2"
              >
                <div
                  className={cn(
                    "relative min-h-64 bg-background-dimmed md:min-h-72",
                    reversed && "md:order-2",
                  )}
                >
                  <RevealItem className="h-full w-full">
                    <ToolArt
                      art={tool.art}
                      className="h-full min-h-64 w-full md:min-h-72"
                    />
                  </RevealItem>
                </div>
                <div
                  className={cn(
                    "p-6 md:p-10",
                    tool.highlighted
                      ? "bg-primary text-white"
                      : "bg-background-rich text-foreground",
                    reversed && "md:order-1",
                  )}
                >
                  <RevealItem className="flex h-full flex-col gap-3">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        tool.highlighted ? "text-white" : "text-primary",
                      )}
                    >
                      {tool.number} · {tool.category}
                    </p>
                    <h3 className="mt-1 font-body font-medium text-3xl md:text-4xl">
                      {tool.title}
                    </h3>
                    <p
                      className={cn(
                        "font-light text-lg leading-relaxed",
                        tool.highlighted
                          ? "text-white"
                          : "text-foreground-dimmed",
                      )}
                    >
                      {tool.description}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {tool.features.map((feature) => (
                        <li
                          key={feature}
                          className={cn(
                            "flex items-center gap-2",
                            tool.highlighted
                              ? "text-white"
                              : "text-foreground-dimmed",
                          )}
                        >
                          <CheckIcon
                            className={cn(
                              "size-4 shrink-0",
                              tool.highlighted
                                ? "text-white/80"
                                : "text-primary",
                            )}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      color={tool.highlighted ? "accent" : "primary"}
                      className="mt-6 w-fit md:mt-auto"
                      render={<Link href={tool.href} />}
                    >
                      {tool.action.primary}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  </RevealItem>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
