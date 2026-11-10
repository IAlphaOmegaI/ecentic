import { getLocale, getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.changelog.meta, "/changelog");
};

export default async () => {
  const locale = await getLocale();
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.changelog;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <MarketingPage
      content={content}
      path="/changelog"
      sectionChildren={{
        updates: (
          <ol>
            {content.entries.map((entry) => (
              <li
                key={entry.commit}
                className="grid gap-8 border-accent-foreground border-t px-4 py-8 md:grid-cols-[200px_minmax(0,1fr)] md:px-8"
              >
                <div>
                  <time dateTime={entry.date}>
                    {dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
                  </time>
                  <p className="mt-2 font-medium text-primary">{entry.label}</p>
                </div>
                <article>
                  <h3>{entry.title}</h3>
                  <p className="mt-4 max-w-3xl">{entry.body}</p>
                </article>
              </li>
            ))}
          </ol>
        ),
      }}
    />
  );
};
