import { FileIcon } from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { SetupPage } from "../../_components/setup-page";
import { CsvForm } from "./_components/csv-form";

export default async () => {
  const translate = await getTranslations("onboarding.connect");
  return (
    <SetupPage
      title={translate("csv.title")}
      description={translate("csv.description")}
      icon={<FileIcon aria-hidden className="mb-6 size-10 text-primary-text" />}
      guidance={
        <section>
          <h2 className="mb-6 font-medium text-foreground-rich text-lg">
            {translate("csv.columns.title")}
          </h2>
          <div className="space-y-4 text-foreground text-sm leading-relaxed">
            <p>{translate("csv.columns.required")}</p>
            <p>{translate("csv.columns.optional")}</p>
            <p className="border-accent-foreground border-t pt-4 text-foreground-dimmed">
              {translate("csv.columns.hint")}
            </p>
          </div>
        </section>
      }
    >
      <CsvForm />
    </SetupPage>
  );
};
