import { EvolvingAscii } from "./evolving-ascii";

type ArtworkProps = { className?: string };

/** Legacy entry points share the selected tonal-dot renderer. */
export const AsciiCommerceArtwork = (props: AsciiCommerceArtwork.Props) => (
  <EvolvingAscii {...props} artwork="commerce" />
);

export const AsciiClosingArtwork = (props: AsciiClosingArtwork.Props) => (
  <EvolvingAscii {...props} artwork="closing" />
);

export namespace AsciiCommerceArtwork {
  export type Props = ArtworkProps;
}

export namespace AsciiClosingArtwork {
  export type Props = ArtworkProps;
}
