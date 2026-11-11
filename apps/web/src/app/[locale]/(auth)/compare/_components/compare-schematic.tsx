import Image from "next/image";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";
import { providerLogos } from "@/content/provider-logos";

const models = ["chatgpt", "claude", "gemini", "perplexity"] as const;

export const CompareSchematic = ({
  productA,
  productB,
  caption,
}: CompareSchematic.Props) => (
  <figure className="relative m-0 flex min-w-0 flex-col justify-center border-accent-foreground bg-background-dimmed p-6 max-sm:px-4 max-md:border-t md:border-l">
    <Plus className="-bottom-1.5 -left-1.5 max-md:hidden" />
    <div className="grid grid-cols-2 gap-6">
      {[
        { label: productA, artwork: "cart" as const },
        { label: productB, artwork: "bag" as const },
      ].map(({ label, artwork }) => (
        <div key={label} className="min-w-0 text-center">
          <div className="h-28 text-primary max-sm:h-24">
            <EvolvingAscii artwork={artwork} />
          </div>
          <p className="mt-2 text-foreground text-sm">{label}</p>
        </div>
      ))}
    </div>
    <div
      aria-hidden="true"
      className="mx-[24%] h-4 border-accent-foreground border-x border-b"
    />
    <div aria-hidden="true" className="mx-auto h-4 w-px bg-accent-foreground" />
    <div className="flex items-start justify-between gap-4 border-accent-foreground border-t pt-4">
      {models.map((model) => {
        const logo = providerLogos[model];
        return (
          <div
            key={model}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <Image
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              className="size-8 object-contain"
            />
            <span className="text-foreground-dimmed text-xs">{logo.name}</span>
          </div>
        );
      })}
    </div>
    <figcaption className="mt-4 text-center text-foreground-dimmed text-sm leading-relaxed">
      {caption}
    </figcaption>
  </figure>
);

export namespace CompareSchematic {
  export type Props = {
    productA: string;
    productB: string;
    caption: string;
  };
}
