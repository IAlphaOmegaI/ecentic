import { Button } from "@zenncore/web/components/button";
import { Link } from "@/i18n/navigation";
import { SolutionRoadmap } from "../solution-roadmap";

const figures = ["inspection", "workflow", "hub"] as const;

export const EnterpriseEngagements = ({
  items,
  content,
  action,
}: EnterpriseEngagements.Props) => (
  <>
    <SolutionRoadmap
      label={content.label}
      items={items.flatMap((item, index) => {
        const engagement = content.items[index];
        if (!engagement) return [];
        return [
          {
            title: item.title,
            body: item.body,
            eyebrow: engagement.duration,
            scope: engagement.question,
            path: engagement.path,
            href: action.href,
            action: action.label,
            figure: figures[index] ?? "hub",
          },
        ];
      })}
    />
    <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4">
      <Button color="neutral" render={<Link href="#pilot" />}>
        {content.pilotAction}
      </Button>
    </div>
  </>
);

export namespace EnterpriseEngagements {
  export type Props = {
    items: readonly { title: string; body: string }[];
    action: { label: string; href: string };
    content: {
      label: string;
      pilotAction: string;
      items: readonly {
        duration: string;
        question: string;
        path: readonly string[];
      }[];
    };
  };
}
