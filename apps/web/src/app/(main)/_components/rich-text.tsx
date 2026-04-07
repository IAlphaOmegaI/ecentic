import type { ReactNode } from "react";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const segmentPattern =
  /(\[[^\]]+\]\([^)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export const renderInline = (
  text: string,
  options: RenderInlineOptions = {},
): ReactNode[] =>
  text.split(/\*\*(.*?)\*\*/g).flatMap((part, index) => {
    if (index % 2 === 1)
      return [
        <strong
          key={`${part}-${index}`}
          className={options.strongClassName ?? "text-foreground"}
        >
          {part}
        </strong>,
      ];

    return part.split(segmentPattern).map((segment, innerIndex) => {
      const link = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

      if (link) {
        return (
          <a
            // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this inline content renderer
            key={`${index}-${innerIndex}`}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={
              options.linkClassName ??
              "text-primary underline-offset-2 hover:underline"
            }
          >
            {link[1]}
          </a>
        );
      }

      if (emailPattern.test(segment)) {
        return (
          <a
            // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this inline content renderer
            key={`${index}-${innerIndex}`}
            href={`mailto:${segment}`}
            className={
              options.emailClassName ??
              "text-primary underline-offset-2 hover:underline"
            }
          >
            {segment}
          </a>
        );
      }

      return segment;
    });
  });

type RenderInlineOptions = {
  strongClassName?: string;
  linkClassName?: string;
  emailClassName?: string;
};
