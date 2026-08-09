import { CheckIcon } from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { BookingEmbed } from "@/components/cal";
import { Plus } from "@/components/plus";

const expectationKeys = ["winRate", "diagnosis", "optimizations"] as const;

export const Booking = async () => {
  const translate = await getTranslations("home");

  return (
    <section
      id="book"
      className="relative -left-[calc(50vw-50%)] w-screen scroll-mt-[5.5rem]"
    >
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="relative border-accent-foreground p-6 md:p-12">
          <p className="font-light text-primary text-xl">
            {translate("booking.eyebrow")}
          </p>
          <h2 className="mt-4 font-body font-medium text-3xl text-foreground md:text-5xl">
            {translate("booking.title")}
          </h2>
          <p className="mt-5 max-w-2xl font-body font-light text-foreground-dimmed text-lg">
            {translate("booking.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-5">
          <div className="flex flex-col divide-y divide-accent-foreground border-accent-foreground md:col-span-2 md:border-r">
            {expectationKeys.map((key) => (
              <div key={key} className="flex gap-4 p-6 md:p-8">
                <span className="flex size-10 shrink-0 items-center justify-center border border-accent-foreground bg-background text-primary">
                  <CheckIcon className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-medium text-foreground text-xl">
                    {translate(`booking.expectations.${key}.title`)}
                  </h3>
                  <p className="font-light text-base text-foreground-dimmed">
                    {translate(`booking.expectations.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
            <p className="mt-auto p-6 font-light text-foreground-dimmed md:p-8">
              {translate("booking.footnote")}
            </p>
          </div>

          <div className="h-[620px] w-full overflow-hidden bg-background md:col-span-3">
            <BookingEmbed />
          </div>
        </div>
      </div>
    </section>
  );
};
