import { SolutionRoadmap } from "./solution-roadmap";

const figures = ["inspection", "format", "checkout", "relay"] as const;

export const BusinessChallenges = ({
  items,
  labels,
}: BusinessChallenges.Props) => (
  <SolutionRoadmap
    label={labels.after}
    items={items.map((item, index) => ({
      title: item.before,
      body: item.after,
      href: item.href,
      action: labels.link,
      figure: figures[index % figures.length] ?? "inspection",
    }))}
  />
);

export namespace BusinessChallenges {
  export type Props = {
    labels: { before: string; after: string; link: string };
    items: readonly { before: string; after: string; href: string }[];
  };
}
