import { cn } from "@zenncore/utils";
import { closingAscii, commerceAscii } from "@/content/ascii-artwork";

type ArtworkProps = { className?: string };

const AsciiArtwork = ({ artwork, className }: AsciiArtwork.Props) => (
  <div
    aria-hidden="true"
    className={cn(
      "ascii-text-artwork pointer-events-none grid size-full select-none place-items-center overflow-hidden text-inherit [container-type:size] [&_pre]:m-0 [&_pre]:w-[73.2em] [&_pre]:overflow-visible [&_pre]:whitespace-pre [&_pre]:p-0 [&_pre]:text-left [&_pre]:font-medium [&_pre]:font-mono [&_pre]:text-[min(calc(100cqw/73.2),calc(100cqh/48))] [&_pre]:text-inherit [&_pre]:leading-none [&_pre]:tracking-normal [&_pre]:[font-variant-ligatures:none]",
      className,
    )}
  >
    <pre>{artwork}</pre>
  </div>
);

export const AsciiCommerceArtwork = (props: AsciiCommerceArtwork.Props) => (
  <AsciiArtwork {...props} artwork={commerceAscii} />
);

export const AsciiClosingArtwork = (props: AsciiClosingArtwork.Props) => (
  <AsciiArtwork {...props} artwork={closingAscii} />
);

namespace AsciiArtwork {
  export type Props = ArtworkProps & { artwork: string };
}

export namespace AsciiCommerceArtwork {
  export type Props = ArtworkProps;
}

export namespace AsciiClosingArtwork {
  export type Props = ArtworkProps;
}
