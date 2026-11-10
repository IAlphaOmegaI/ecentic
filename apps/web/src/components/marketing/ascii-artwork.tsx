import { cn } from "@zenncore/utils";
import { closingAscii, commerceAscii } from "@/content/ascii-artwork";
import "./ascii-artwork.css";

type ArtworkProps = { className?: string };

const AsciiArtwork = ({
  artwork,
  className,
}: ArtworkProps & { artwork: string }) => (
  <div aria-hidden="true" className={cn("ascii-text-artwork", className)}>
    <pre>{artwork}</pre>
  </div>
);

export const AsciiCommerceArtwork = (props: ArtworkProps) => (
  <AsciiArtwork {...props} artwork={commerceAscii} />
);

export const AsciiClosingArtwork = (props: ArtworkProps) => (
  <AsciiArtwork {...props} artwork={closingAscii} />
);
