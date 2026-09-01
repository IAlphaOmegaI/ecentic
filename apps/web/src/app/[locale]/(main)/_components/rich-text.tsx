import type { ReactNode } from "react";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const segmentPattern =
  /(\[[^\]]+\]\([^)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const isBullet = (line: string) =>
  line.startsWith("- ") || line.startsWith("* ");
const isOrdered = (line: string) => /^\d+\.\s/.test(line);
const isList = (line: string) => isBullet(line) || isOrdered(line);

const renderLinksAndEmails = (
  text: string,
  offset: number,
  options: RenderInlineOptions,
): { offset: number; nodes: ReactNode[] } =>
  text.split(segmentPattern).reduce(
    (result, segment) => {
      const link = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

      if (link) {
        return {
          offset: result.offset + segment.length,
          nodes: [
            ...result.nodes,
            <a
              key={`link-${result.offset}`}
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
          offset: result.offset + segment.length,
          nodes: [
            ...result.nodes,
            <a
              key={`email-${result.offset}`}
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
        offset: result.offset + segment.length,
        nodes: [...result.nodes, segment],
      };
    },
    { offset, nodes: [] as ReactNode[] },
  );

const renderBold = (
  text: string,
  offset: number,
  options: RenderInlineOptions,
): { offset: number; nodes: ReactNode[] } =>
  text.split(/\*\*(.*?)\*\*/g).reduce(
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

      const inline = renderLinksAndEmails(part, state.offset, options);
      return {
        offset: inline.offset,
        nodes: [...state.nodes, ...inline.nodes],
      };
    },
    { offset, nodes: [] as ReactNode[] },
  );

export const renderInline = (
  text: string,
  options: RenderInlineOptions = {},
): ReactNode[] => {
  const rendering = text.split(/(`[^`]+`)/g).reduce(
    (state, part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return {
          offset: state.offset + part.length,
          nodes: [
            ...state.nodes,
            <code
              key={`code-${state.offset}`}
              className={
                options.codeClassName ??
                "rounded-sm bg-background-dimmed px-1 font-mono text-[0.9em]"
              }
            >
              {part.slice(1, -1)}
            </code>,
          ],
        };
      }

      const inline = renderBold(part, state.offset, options);
      return {
        offset: inline.offset,
        nodes: [...state.nodes, ...inline.nodes],
      };
    },
    { offset: 0, nodes: [] as ReactNode[] },
  );

  return rendering.nodes;
};

const itemText = (line: string) =>
  isBullet(line) ? line.slice(2) : line.replace(/^\d+\.\s/, "");

const List = ({
  lines,
  options,
}: {
  lines: string[];
  options: RenderInlineOptions;
}) => {
  const ordered = isOrdered(lines[0] ?? "");
  const Item = ordered ? "ol" : "ul";

  return (
    <Item
      className={
        ordered
          ? "flex list-decimal flex-col gap-2 pl-5"
          : "flex flex-col gap-2"
      }
    >
      {lines.map((line, index) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
          key={index}
          className={ordered ? "leading-relaxed" : "flex gap-3 leading-relaxed"}
        >
          {ordered ? (
            renderInline(itemText(line), options)
          ) : (
            <>
              <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{renderInline(itemText(line), options)}</span>
            </>
          )}
        </li>
      ))}
    </Item>
  );
};

/**
 * Block-level Markdown for third-party replies: paragraphs, lists, bold,
 * links, and inline code. Markers become elements; the rest stays text.
 */
export const renderProse = (
  text: string,
  options: RenderInlineOptions = {},
): ReactNode => {
  const blocks = text.trim().split(/\n\n+/);

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trimEnd());
        const start = lines.findIndex(isList);

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
            <p key={index} className="leading-relaxed">
              {renderInline(lines.join(" "), options)}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
          <div key={index} className="flex flex-col gap-2">
            {paragraphs.length > 0 && (
              <p className="leading-relaxed">
                {renderInline(paragraphs.join(" "), options)}
              </p>
            )}
            <List lines={lists} options={options} />
          </div>
        );
      })}
    </div>
  );
};

type RenderInlineOptions = {
  strongClassName?: string;
  linkClassName?: string;
  emailClassName?: string;
  codeClassName?: string;
};
