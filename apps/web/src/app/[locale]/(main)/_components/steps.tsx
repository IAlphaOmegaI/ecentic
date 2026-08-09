import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { Reveal, RevealItem } from "@/components/reveal";
import type { Locale } from "@/i18n/routing";

export const Steps = async ({ locale }: Steps.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section
      id="how"
      className="relative -left-[calc(50vw-50%)] -z-1 h-fit w-screen scroll-mt-[5.5rem] p-1"
    >
      <div className="rounded-xl bg-primary pb-6 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-2 p-6 text-white md:px-24 md:pt-24 md:pb-0">
            <h2 className="font-body font-medium text-4xl sm:text-5xl md:text-[76px]">
              {translate("steps.title")}
            </h2>
            <p className="font-light text-xl md:text-3xl">
              {translate("steps.description")}
            </p>
          </div>
          <Reveal className="mt-8 grid w-full grid-cols-1 text-white md:mt-24 md:h-[1100px] md:grid-cols-2 md:grid-rows-3">
            <RevealItem className="relative col-start-1 row-start-1 flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-6 md:items-end md:border-r md:border-b-0 md:pr-8 md:pl-24">
              <div className="absolute top-1/2 -right-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
              <RobotIcon className="size-16" />
              <p className="font-medium text-4xl">
                {translate("steps.connect.title")}
              </p>
              <p className="text-left font-light text-lg md:text-right">
                {translate("steps.connect.description")}
              </p>
            </RevealItem>
            <div className="hidden md:block" />
            <div className="hidden border-white md:block md:border-t md:border-r" />
            <RevealItem className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-6 md:border-t md:border-b-0 md:pr-24 md:pl-8">
              <div className="absolute bottom-1/2 -left-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
              <FaceSearchIcon className="size-16" />
              <p className="font-medium text-4xl">
                {translate("steps.diagnose.title")}
              </p>
              <p className="text-left font-light text-lg">
                {translate("steps.diagnose.description")}
              </p>
            </RevealItem>
            <RevealItem className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white p-6 md:items-end md:border-t md:border-r md:pr-8 md:pl-24">
              <div className="absolute -right-1/2 bottom-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
              <CircleBoltIcon className="size-16" />
              <p className="font-medium text-4xl">
                {translate("steps.optimize.title")}
              </p>
              <p className="text-left font-light text-lg md:text-right">
                {translate("steps.optimize.description")}
              </p>
            </RevealItem>
            <div className="hidden border-white md:block md:border-t" />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export namespace Steps {
  export type Props = {
    locale: Locale;
  };
}
