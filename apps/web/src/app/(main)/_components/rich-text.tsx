import type { ReactNode } from "react";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const segmentPattern =
  /(\[[^\]]+\]\([^)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export const renderInline = (
  text: string,
  options: RenderInlineOptions = {},
): ReactNode[] => {
  const rendering = text.split(/\*\*(.*?)\*\*/g).reduce(
    (state, part, index) => {
      if (index % 2 === 1) {
        return {
          offset: state.offset + part.length,
          nodes: [
            ...state.nodes,
            <strong
              key={`strong-${state.offset}`}
              className={options.strongClassName ?? "text-foreground"}
            >
              {part}
            </strong>,
          ],
        };
      }

      const inline = part.split(segmentPattern).reduce(
        (result, segment) => {
          const offset = result.offset;
          const link = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

          if (link) {
            return {
              offset: offset + segment.length,
              nodes: [
                ...result.nodes,
                <a
                  key={`link-${offset}`}
                  href={link[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    options.linkClassName ??
                    "text-primary underline-offset-2 hover:underline"
                  }
                >
                  {link[1]}
                </a>,
              ],
            };
          }

          if (emailPattern.test(segment)) {
            return {
              offset: offset + segment.length,
              nodes: [
                ...result.nodes,
                <a
                  key={`email-${offset}`}
                  href={`mailto:${segment}`}
                  className={
                    options.emailClassName ??
                    "text-primary underline-offset-2 hover:underline"
                  }
                >
                  {segment}
                </a>,
              ],
            };
          }

          return {
            offset: offset + segment.length,
            nodes: [...result.nodes, segment],
          };
        },
        { offset: state.offset, nodes: [] as ReactNode[] },
      );

      return {
        offset: inline.offset,
        nodes: [...state.nodes, ...inline.nodes],
      };
    },
    { offset: 0, nodes: [] as ReactNode[] },
  );

  return rendering.nodes;
};

type RenderInlineOptions = {
  strongClassName?: string;
  linkClassName?: string;
  emailClassName?: string;
};
