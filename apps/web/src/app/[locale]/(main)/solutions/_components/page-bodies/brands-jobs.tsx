import { SolutionRoadmap } from "../solution-roadmap";

const figures = ["catalog", "format", "checkout", "relay"] as const;

export const BrandsJobs = ({ jobs, challenges, link }: BrandsJobs.Props) => (
  <SolutionRoadmap
    label={jobs.label}
    items={jobs.items.flatMap((job, index) => {
      const challenge = challenges[index];
      if (!challenge) return [];
      return [
        {
          title: challenge.before,
          body: challenge.after,
          eyebrow: job.label,
          scope: job.scope,
          path: job.path,
          href: challenge.href,
          action: link,
          figure: figures[index] ?? "catalog",
        },
      ];
    })}
  />
);

export namespace BrandsJobs {
  export type Props = {
    jobs: {
      label: string;
      details: string;
      items: readonly {
        id: string;
        label: string;
        scope: string;
        path: readonly string[];
      }[];
    };
    challenges: readonly { before: string; after: string; href: string }[];
    link: string;
  };
}
