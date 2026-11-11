import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import { StepPlayer } from "@/components/marketing/interactive/step-player";
import { Link } from "@/i18n/navigation";

export const EnterprisePilot = async () => {
  const { enterpriseSolutions, interactivePilot } = await getMessages();
  const sections = enterpriseSolutions.business.enterprise.sections;
  const pilot = sections.find((section) => section.id === "pilot");
  const measures = sections.find((section) => section.id === "measures");
  const steps = (pilot?.items ?? []).map((item, index) => ({
    id: String(index),
    label: interactivePilot.stages[index] ?? item.title,
    content: (
      <dl className="grid sm:grid-cols-2">
        {[
          { label: interactivePilot.happens, value: item.body },
          // {{TODO: Xhurian confirms the customer people for each pilot stage.}}
          {
            label: interactivePilot.people,
            value: interactivePilot.pendingPeople,
          },
          // {{TODO: Xhurian confirms the deliverable for each pilot stage.}}
          {
            label: interactivePilot.deliverable,
            value: interactivePilot.pendingDeliverable,
          },
          // {{TODO: Xhurian confirms the duration for each pilot stage.}}
          {
            label: interactivePilot.duration,
            value: interactivePilot.pendingDuration,
          },
        ].map((line) => (
          <div
            key={line.label}
            className="border-accent-foreground border-t px-8 py-6 max-sm:px-4 sm:odd:border-r"
          >
            <dt className="font-medium">{line.label}</dt>
            <dd className="mt-4 text-foreground">
              {line.value || interactivePilot.pending}
            </dd>
          </div>
        ))}
      </dl>
    ),
  }));
  return (
    <div
      data-interactive="pilot-planner"
      className="border-accent-foreground border-t bg-background-dimmed"
    >
      <StepPlayer
        label={pilot?.title ?? interactivePilot.title}
        steps={steps}
        activateOnFocus
      />
      <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-t px-8 py-6 max-sm:px-4">
        {measures?.items?.map((measure) => (
          <Button
            key={measure.title}
            variant="outline"
            color="neutral"
            render={<Link href="#measures" />}
          >
            {measure.title}
          </Button>
        ))}
      </div>
    </div>
  );
};
