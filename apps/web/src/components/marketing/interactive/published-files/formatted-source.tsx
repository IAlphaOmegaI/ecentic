const parts =
  /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b)/g;

/** Tokenize only presentation. Strings remain React text nodes, never HTML. */
export const FormattedSource = ({
  source,
  startLine = 1,
}: {
  source: string;
  startLine?: number;
}) => (
  <pre className="min-w-0 py-5 font-mono text-[13px] text-background-rich/80 leading-6 max-sm:text-xs">
    <code>
      {source.split("\n").map((line, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: line position is the displayed line number.
          key={index}
          className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] px-4 max-sm:grid-cols-[2rem_minmax(0,1fr)] max-sm:px-3"
        >
          <span
            aria-hidden
            className="select-none pr-4 text-right text-background-rich/45"
          >
            {index + startLine}
          </span>
          <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            <FormattedSourceTokens source={line} />
          </span>
        </span>
      ))}
    </code>
  </pre>
);

/** Shared escaped syntax tokens for ordinary source and unified diff lines. */
export const FormattedSourceTokens = ({ source }: { source: string }) => (
  <>
    {source.split(parts).map((part, position) => (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: token positions are deterministic within the source line.
        key={position}
        className={
          /^".*"\s*:$/.test(part)
            ? "text-primary-rich"
            : /^"/.test(part)
              ? "text-info-foreground"
              : /^(true|false)$/.test(part)
                ? "text-success-rich"
                : part === "null"
                  ? "text-secondary-rich"
                  : /^-?\d/.test(part)
                    ? "text-warning-rich"
                    : undefined
        }
      >
        {part}
      </span>
    ))}
    {source.length === 0 && " "}
  </>
);
