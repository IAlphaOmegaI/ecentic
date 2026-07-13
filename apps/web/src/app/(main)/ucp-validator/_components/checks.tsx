import { CheckIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";
import { UcpArt } from "@/app/(main)/resources/_components/resource-art";
import { Reveal, RevealItem } from "@/app/(main)/resources/_components/reveal";

const checks = [
  {
    title: "Endpoint reachability",
    description:
      "We request the public HTTPS domain and confirm that /.well-known/ucp responds.",
  },
  {
    title: "Schema hygiene",
    description:
      "The response body is parsed as JSON and checked for UCP spec errors and warnings.",
  },
  {
    title: "Agent access",
    description:
      "robots.txt is reviewed so you can see whether major shopping and indexing bots are blocked.",
  },
] as const;

export const Checks = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">01</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            What the validator inspects.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            A live fetch of your public profile, parsed against the UCP spec, with
            agent access surfaced from robots.txt.
          </p>
        </RevealItem>
      </Reveal>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="relative min-h-64 bg-background-dimmed md:min-h-72">
          <RevealItem className="h-full w-full">
            <UcpArt className="h-full min-h-64 w-full md:min-h-72" />
          </RevealItem>
        </div>

        <div className="flex flex-col gap-px bg-accent-foreground">
          {checks.map((check) => (
            <div
              key={check.title}
              className="flex flex-1 bg-background-rich p-6 md:p-8"
            >
              <RevealItem className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-4 shrink-0 text-primary" />
                  <h3 className="font-body font-medium text-foreground text-xl">
                    {check.title}
                  </h3>
                </div>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {check.description}
                </p>
              </RevealItem>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
