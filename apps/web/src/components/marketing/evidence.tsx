import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { EvidenceView } from "./evidence-view";

export const EvidenceFrame = async ({
  id,
  title,
  description,
  caption,
  note,
  columns,
  rows,
  source,
  pending,
  children,
}: EvidenceFrame.Props) => {
  const { enterpriseEvidence } = await getMessages();

  return (
    <figure
      id={id}
      aria-labelledby={`${id}-title`}
      className="min-w-0 bg-background"
    >
      <header className="mb-5">
        <h3
          id={`${id}-title`}
          className="max-w-[28ch] font-heading text-[clamp(1.65rem,2.5vw,2.4rem)] leading-tight tracking-[-0.025em]"
        >
          {title}
        </h3>
        {description && <p className="mt-3 max-w-[62ch]">{description}</p>}
      </header>
      <EvidenceView
        id={id}
        title={title}
        columns={columns}
        rows={rows}
        action={enterpriseEvidence.presentation.action}
      >
        {children}
      </EvidenceView>
      {note && (
        <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-sm">
          {note}
        </p>
      )}
      {(caption || source) && (
        <figcaption className="mt-6 space-y-2 border-accent-foreground border-t pt-4 text-foreground-dimmed text-sm leading-relaxed">
          {caption && <p>{caption}</p>}
          {source && (
            <p>
              <span className="font-medium text-foreground">
                {enterpriseEvidence.presentation.source}:{" "}
              </span>
              {source}
            </p>
          )}
        </figcaption>
      )}
      {pending && (
        <p className="mt-4 border-accent-foreground border-l-2 pl-3 text-foreground-dimmed text-sm">
          {pending}
        </p>
      )}
    </figure>
  );
};

export namespace EvidenceFrame {
  export type Props = {
    id: string;
    title: string;
    description?: string;
    caption?: string;
    note?: string;
    columns: readonly string[];
    rows: readonly (readonly string[])[];
    source?: ReactNode;
    pending?: string;
    children: ReactNode;
  };
}
