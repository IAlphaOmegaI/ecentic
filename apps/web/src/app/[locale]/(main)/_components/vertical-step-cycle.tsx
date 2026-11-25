"use client";

import type { Icon } from "@zenncore/icons";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useSequence } from "@/components/marketing/interactive/use-sequence";
import { Motion } from "@/components/motion";

export type StepCycleItem = {
  icon: Icon;
  title: string;
  description: string;
};

namespace Step {
  export type Props = { step: StepCycleItem; index: number };
}

const Step = ({ step, index }: Step.Props) => (
  <div className="flex max-w-xl flex-col gap-4">
    <div className="flex items-center gap-4">
      <span className="font-normal text-lg text-primary-text tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <step.icon aria-hidden="true" className="size-4 text-primary" />
    </div>
    <h4 className="font-body font-medium text-3xl text-foreground md:text-4xl">
      {step.title}
    </h4>
    <p className="font-light text-foreground-dimmed text-lg leading-relaxed">
      {step.description}
    </p>
  </div>
);

export const VerticalStepCycle = ({
  steps,
  layoutId = "step-cycle-underline",
}: VerticalStepCycle.Props) => {
  const { container, active, enhanced, playing, pause, select } = useSequence({
    length: steps.length,
    delay: 3400,
  });

  if (steps.length === 0) return null;

  return (
    <div
      ref={container}
      onPointerDownCapture={pause}
      onFocusCapture={pause}
      data-workflow-cycle={layoutId}
      data-current={active}
      data-playing={playing}
      className="flex min-h-0 flex-1 flex-col bg-background-rich"
    >
      {enhanced ? (
        <Tabs
          value={active}
          onValueChange={(value) => {
            if (typeof value === "number") select(value);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-6 py-8 md:px-8 md:py-10">
            {steps.map((step, index) => (
              <TabsPanel key={step.title} value={index}>
                <Motion.Up
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Step step={step} index={index} />
                </Motion.Up>
              </TabsPanel>
            ))}
          </div>
          <TabsList
            aria-label={steps.map((step) => step.title).join(" · ")}
            className="grid w-full shrink-0 gap-px rounded-none border-0 border-accent-foreground border-t bg-accent-foreground"
            style={{
              gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
            }}
          >
            <TabsIndicator className="pointer-events-none inset-shadow-none top-auto bottom-0 z-10 h-0.5 bg-none bg-primary" />
            {steps.map((step, index) => (
              <Tab
                key={step.title}
                value={index}
                className="group h-auto min-w-0 flex-col items-start gap-2 whitespace-normal rounded-none border-r-0 bg-background-dimmed px-4 py-4 text-left text-foreground-dimmed transition-colors data-[active]:bg-background-rich data-selected:bg-background-rich data-[active]:text-foreground data-selected:text-foreground motion-reduce:transition-none"
              >
                <span className="font-normal text-foreground-dimmed/50 text-sm tabular-nums group-data-selected:text-primary-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-body font-medium text-sm md:text-base">
                  {step.title}
                </span>
              </Tab>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <ol className="m-0 list-none divide-y divide-accent-foreground">
          {steps.map((step, index) => (
            <li key={step.title} className="px-6 py-8 md:px-8">
              <Step step={step} index={index} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export namespace VerticalStepCycle {
  export type Props = {
    steps: readonly StepCycleItem[];
    layoutId?: string;
  };
}
