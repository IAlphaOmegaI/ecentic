import { ArrowRightIcon, CodeIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { Link } from "@/i18n/navigation";
import { seo } from "@/lib/seo";
import { LlmsArt } from "./resource-art";

const endpointRoutes = [
  { href: "/llms.txt", path: "/llms.txt" },
  { href: "/.well-known/api-catalog", path: "/.well-known/api-catalog" },
  {
    href: "/.well-known/oauth-authorization-server",
    path: "/.well-known/oauth-authorization-server",
  },
  { href: "/ucp/agent-profile", path: "/ucp/agent-profile" },
  { href: "/api/mcp", path: "/api/mcp" },
  { href: "/.well-known/ucp", path: "/.well-known/ucp" },
  {
    href: "/.well-known/agent-skills/index.json",
    path: "/.well-known/agent-skills/index.json",
  },
] as const;

export const Developer = async () => {
  const translate = await getTranslations("resources");
  const messages = await getMessages();
  const endpoints = messages.resources.developer.endpoints;

  return (
    <section className="scroll-mt-24 border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("developer.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("developer.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("developer.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="flex flex-col bg-background-dimmed md:min-h-0">
            <RevealItem className="flex flex-col gap-6 p-6 md:p-8">
              <CodeIcon className="size-8 text-primary" />
              <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                {translate("developer.intro")}
              </p>
            </RevealItem>
            <LlmsArt />
          </div>

          <div className="flex flex-col gap-px bg-accent-foreground">
            <h3 className="bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
              {translate("developer.endpointsTitle")}
            </h3>
            {endpoints.map((endpoint, index) => {
              const route = endpointRoutes[index];
              if (!route) return null;

              return (
                <div
                  key={route.path}
                  className="flex bg-background-rich px-6 py-5 md:px-8"
                >
                  <RevealItem className="flex h-full w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <h4
                        className={cn(
                          "font-medium text-foreground text-xl",
                          /[./]/.test(endpoint.title) && "font-mono",
                        )}
                      >
                        {endpoint.title}
                      </h4>
                      <p className="font-light text-foreground-dimmed leading-relaxed">
                        {endpoint.description}
                      </p>
                      <p className="mt-1 font-mono text-foreground-dimmed text-xs">
                        {seo.host}
                        {route.path}
                      </p>
                    </div>
                    <Button
                      color="accent"
                      className="w-fit shrink-0 self-end sm:self-auto"
                      render={<Link href={route.href} />}
                    >
                      {translate("developer.action.primary")}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  </RevealItem>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
