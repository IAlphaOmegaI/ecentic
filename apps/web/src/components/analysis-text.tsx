import { segmentAnalysisText } from "@/lib/analysis-text";

/** AI prose is text, never HTML or executable Markdown. */
export const AnalysisText = ({
  text,
  terms,
  className,
}: {
  text: string;
  terms?: readonly string[];
  className?: string;
}) => (
  <span className={className}>
    {segmentAnalysisText(text, terms).map((segment, index) =>
      segment.emphasized ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: immutable text segments have deterministic order
        <strong key={index} className="font-semibold text-foreground-rich">
          {segment.text}
        </strong>
      ) : (
        segment.text
      ),
    )}
  </span>
);
