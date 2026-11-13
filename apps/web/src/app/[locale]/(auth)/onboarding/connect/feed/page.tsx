import { getMessages, getTranslations } from "next-intl/server";
import { SetupPage } from "../../_components/setup-page";
import { FeedForm } from "./_components/feed-form";

export default async () => {
  const translate = await getTranslations("onboarding.connect");
  const messages = await getMessages();
  return (
    <SetupPage
      title={translate("feed.title")}
      description={translate("feed.description")}
      image="/images/custom.svg"
      guidance={
        <section>
          <h2 className="mb-6 font-medium text-foreground-rich text-lg">
            {translate("feed.formats.title")}
          </h2>
          <dl className="space-y-6">
            {(["googleShopping", "json"] as const).map((format) => (
              <div key={format}>
                <dt className="font-medium text-foreground-rich">
                  {translate(`feed.formats.${format}.label`)}
                </dt>
                <dd className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                  {messages.onboarding.connect.feed.formats[format].description}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      }
    >
      <FeedForm />
    </SetupPage>
  );
};
