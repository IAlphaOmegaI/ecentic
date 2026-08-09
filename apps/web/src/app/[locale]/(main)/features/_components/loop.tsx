import {
  CircleBoltIcon,
  FaceSearchIcon,
  RobotIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";

const stepIcons = [RobotIcon, FaceSearchIcon, CircleBoltIcon, TrendUpIcon] as const;

export const Loop = async () => {
  const translate = await getTranslations("features");
  const steps = translate.raw("loop.steps") as readonly {
    step: string;
    title: string;
    description: string;
  }[];

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("loop.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("loop.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("loop.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-4">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          {steps.map((step, index) => {
            const IconComponent = stepIcons[index] ?? RobotIcon;

            return (
              <div
                key={step.title}
                className="flex flex-col gap-2 bg-background-dimmed p-6 md:p-8"
              >
                <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                  {step.step}
                </p>
                <IconComponent className="mt-2 size-12 text-primary" />
                <h3 className="font-body font-medium text-2xl text-foreground">
                  {step.title}
                </h3>
                <p className="font-body font-light text-foreground-dimmed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
