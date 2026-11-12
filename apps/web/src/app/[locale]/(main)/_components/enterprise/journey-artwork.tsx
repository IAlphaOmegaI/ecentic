import { CommerceFigure } from "@/components/marketing/commerce-figure";

const subjects: Record<string, CommerceFigure.Props["kind"]> = {
  connect: "relay",
  simulate: "hub",
  fix: "repairTools",
  sell: "moneyStack",
  track: "workflow",
};

/** The copy carries the process; one recognizable object anchors each milestone. */
export const JourneyArtwork = ({ stage }: JourneyArtwork.Props) => (
  <div
    data-journey-artwork={stage}
    className="mx-auto w-full max-w-96 py-4 max-sm:max-w-80"
  >
    <CommerceFigure
      kind={subjects[stage] ?? "catalog"}
      surface="dark"
      className="bg-transparent"
    />
  </div>
);

export namespace JourneyArtwork {
  export type Props = {
    stage: string;
  };
}
