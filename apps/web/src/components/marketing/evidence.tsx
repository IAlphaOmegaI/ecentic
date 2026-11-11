import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { EvidenceDetails } from "./evidence-details";
import { EvidenceDisclosure } from "./evidence-disclosure";
import { EvidenceView } from "./evidence-view";

export const EvidenceFrame = async ({
  id,
  title,
  description,
  caption,
  note,
  source,
  pending,
  compact = false,
  collapsible = false,
  children,
}: EvidenceFrame.Props) => {
  const { enterpriseEvidence } = await getMessages();

  if (collapsible) {
    return (
      <figure
        id={id}
        aria-labelledby={`${id}-title`}
        className="relative min-w-0 bg-background p-7 max-sm:p-4"
      >
        <EvidenceDisclosure id={id} title={title}>
          {description && (
            <p className="mb-6 max-w-[62ch] text-foreground-dimmed">
              {description}
            </p>
          )}
          <EvidenceView>{children}</EvidenceView>
          <div className="mt-6 space-y-3 border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm">
            {note && <p>{note}</p>}
            {caption && <p>{caption}</p>}
            {source && (
              <p>
                {enterpriseEvidence.presentation.source}: {source}
              </p>
            )}
            {pending && <p>{pending}</p>}
          </div>
        </EvidenceDisclosure>
      </figure>
    );
  }

  return (
    <figure
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative min-w-0 bg-background p-7 max-sm:p-4"
    >
      <header className="relative mb-6">
        <h3
          id={`${id}-title`}
          className="max-w-[28ch] font-heading text-[clamp(1.65rem,2.5vw,2.4rem)] leading-tight tracking-[-0.025em]"
        >
          {title}
        </h3>
        {description && (
          <p className="mt-4 max-w-[62ch] text-foreground-dimmed">
            {description}
          </p>
        )}
      </header>
      <EvidenceView>{children}</EvidenceView>
      {compact ? (
        <EvidenceDetails label={enterpriseEvidence.presentation.source}>
          {note && <p>{note}</p>}
          {caption && <p>{caption}</p>}
          {source && <p>{source}</p>}
          {pending && <p>{pending}</p>}
        </EvidenceDetails>
      ) : (
        <>
          {note && (
            <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-sm">
              {note}
            </p>
          )}
          {(caption || source) && (
            <figcaption className="mt-6 space-y-2 text-foreground-dimmed text-xs leading-relaxed">
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
            <p className="mt-4 text-foreground-dimmed text-xs">{pending}</p>
          )}
        </>
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
    source?: ReactNode;
    pending?: string;
    compact?: boolean;
    collapsible?: boolean;
    children: ReactNode;
  };
}
