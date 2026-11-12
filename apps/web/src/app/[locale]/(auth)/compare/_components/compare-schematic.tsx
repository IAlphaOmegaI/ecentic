import Image from "next/image";
import { providerLogos } from "@/content/provider-logos";

const models = ["chatgpt", "claude", "gemini", "perplexity"] as const;

/** The model roster accompanies the single inspection figure in the hero. */
export const CompareSchematic = ({
  productA,
  productB,
  caption,
}: CompareSchematic.Props) => (
  <figure className="m-0 mt-8 min-w-0 border-background-rich/20 border-t pt-6">
    <div className="mb-5 flex items-center gap-4 text-background-rich/85 text-sm">
      <span>{productA}</span>
      <span aria-hidden="true" className="h-px w-12 bg-background-rich/35" />
      <span>{productB}</span>
    </div>
    <ul className="grid grid-cols-4 gap-4">
      {models.map((model) => {
        const logo = providerLogos[model];
        return (
          <li key={model} className="flex min-w-0 flex-col items-start gap-3">
            <Image
              src={model === "chatgpt" ? "/images/chatgpt.svg" : logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              className="size-9 object-contain brightness-0 invert"
            />
            <span className="text-background-rich/85 text-xs">{logo.name}</span>
          </li>
        );
      })}
    </ul>
    <figcaption className="mt-5 text-background-rich/65 text-sm leading-relaxed">
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
