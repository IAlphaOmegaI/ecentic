import { CommerceFilePenIcon, UserIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Plus } from "@/components/plus";

const subjects = ["catalog", "format", "inspection", "document"] as const;

/** The whole pilot is visible. Sample planning content is separated from product claims. */
export const EnterprisePilot = async () => {
  const { enterpriseSolutions, enterprisePilotPreview: sample } =
    await getMessages();
  const pilot = enterpriseSolutions.business.enterprise.sections.find(
    (section) => section.id === "pilot",
  );
  return (
    <div data-enterprise-pilot="sample" className="relative">
      <div className="relative grid border-background-rich/15 border-b lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 bg-linear-to-br from-primary/14 via-transparent to-transparent px-4 py-8 sm:px-8">
          <p className="font-medium text-primary-rich text-sm">
            {sample.label}
          </p>
          <h3 className="mt-4 max-w-[24ch] text-3xl text-background-rich leading-tight">
            {sample.title}
          </h3>
          <p className="mt-4 max-w-[54ch] text-background-rich/65 text-sm leading-relaxed">
            {sample.note}
          </p>
        </div>
        <dl className="grid content-center divide-y divide-background-rich/15 border-background-rich/15 max-lg:border-t lg:border-l">
          {[
            { label: sample.marketLabel, value: sample.market },
            { label: sample.categoryLabel, value: sample.category },
            { label: sample.sourceLabel, value: sample.source },
          ].map((entry) => (
            <div
              key={entry.label}
              className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_2fr] sm:px-8"
            >
              <dt className="text-background-rich/55 text-sm">{entry.label}</dt>
              <dd className="m-0 font-medium text-background-rich">
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>
        <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
      </div>
      <ol className="relative m-0 grid list-none sm:grid-cols-2 lg:grid-cols-4">
        {pilot?.items?.map((item, index) => {
          const example = sample.stages[index];
          if (!example) return null;
          return (
            <li
              key={item.title}
              data-pilot-stage={index}
              className="relative flex min-w-0 flex-col border-background-rich/15 border-b last:border-b-0 sm:nth-last-2:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0"
            >
              <div className="flex min-h-24 items-start gap-4 px-4 pt-8 sm:px-6">
                <span className="font-heading text-4xl text-primary-rich tabular-nums leading-none">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className="pt-1 font-heading text-background-rich text-xl leading-tight">
                  {item.title}
                </h4>
              </div>
              <CommerceFigure
                kind={subjects[index] ?? "document"}
                surface="dark"
                className="mx-auto max-w-64"
              />
              <div className="flex flex-1 flex-col px-4 pb-8 sm:px-6">
                <div className="min-h-48 border-background-rich/15 border-y py-5 max-sm:min-h-0">
                  <p className="text-primary-rich text-sm">
                    {example.exampleLabel}
                  </p>
                  <p className="mt-3 text-background-rich leading-relaxed">
                    {example.example}
                  </p>
                </div>
                <dl className="mt-6 grid gap-6">
                  {[
                    {
                      Icon: UserIcon,
                      label: sample.peopleLabel,
                      value: example.people,
                    },
                    {
                      Icon: CommerceFilePenIcon,
                      label: sample.deliverableLabel,
                      value: example.deliverable,
                    },
                  ].map(({ Icon, label, value }) => (
                    <div
                      key={label}
                      className="grid grid-cols-[24px_1fr] gap-x-3 gap-y-2 first:min-h-28 max-sm:first:min-h-0"
                    >
                      <Icon
                        aria-hidden
                        className="row-span-2 size-6 text-primary-rich"
                      />
                      <dt className="text-background-rich/55 text-sm">
                        {label}
                      </dt>
                      <dd className="col-start-2 m-0 text-background-rich/85 text-sm leading-relaxed">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            </li>
          );
        })}
      </ol>
    </div>
  );
};
