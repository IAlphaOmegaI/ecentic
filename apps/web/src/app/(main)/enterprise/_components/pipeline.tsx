import Image from "next/image";
import { Plus } from "@/components/plus";

const pipeline = [
  {
    name: "Mastercard",
    logo: "/partners/enterprise/mastercard.png",
    status: "In conversation",
    description:
      "Exploring agent-commerce trust infrastructure for Mastercard-connected merchants.",
  },
  {
    name: "Visa",
    logo: "/partners/enterprise/visa.png",
    status: "In conversation",
    description:
      "Evaluating agent traffic analytics and UCP signing for Visa's merchant network.",
  },
  {
    name: "Inditex",
    logo: "/partners/enterprise/inditex.svg",
    status: "In conversation",
    description:
      "Piloting multi-brand agent simulation across Zara, Pull&Bear, and Massimo Dutti.",
  },
  {
    name: "Carrefour",
    logo: "/partners/enterprise/carrefour.svg",
    status: "In conversation",
    description:
      "Assessing agent-readiness scoring and write-back optimization across SKUs.",
  },
] as const;

export const Pipeline = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Enterprise conversations underway.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Active pilot conversations introduced via Plug and Play Tirana, not
          signed deals. Full transparency on where the enterprise motion stands.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Image
            src="/partners/enterprise/plug-and-play.svg"
            alt="Plug and Play Tirana"
            width={140}
            height={32}
            className="h-8 w-auto"
          />
          <span className="font-light text-foreground-dimmed text-sm">
            Tirana Batch 2
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
        {pipeline.map((entry) => (
          <article
            key={entry.name}
            className="flex flex-col gap-4 bg-background-rich p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-accent-foreground bg-background px-3">
                  <Image
                    src={entry.logo}
                    alt={entry.name}
                    width={112}
                    height={40}
                    className="max-h-8 w-auto object-contain"
                  />
                </div>
                <h3 className="font-body font-medium text-foreground text-xl">
                  {entry.name}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-medium text-primary text-sm">
                {entry.status}
              </span>
            </div>
            <p className="font-light text-foreground-dimmed leading-relaxed">
              {entry.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
