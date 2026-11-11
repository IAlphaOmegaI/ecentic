import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { notFoundMarkdown, RECOVERY_LINKS } from "@/lib/not-found";
import { seo } from "@/lib/seo";

export const recoveryMetadata = async (locale: Locale): Promise<Metadata> => {
  const { enterpriseRecovery } = await getMessages({ locale });
  return {
    metadataBase: new URL(seo.host),
    title: { absolute: enterpriseRecovery.notFound.meta.title },
    description: enterpriseRecovery.notFound.meta.description,
    robots: { index: false, follow: true },
    alternates: { types: { "text/markdown": "/404.md" } },
  };
};

export const NotFoundContent = async ({ locale }: NotFoundContent.Props) => {
  const { enterpriseRecovery } = await getMessages({ locale });
  const content = enterpriseRecovery.notFound;
  return (
    <main id="main-content">
      <section className="marketing-band marketing-hero relative [&_.marketing-cell]:pt-[88px] [&_.marketing-cell]:pb-[72px] max-sm:[&_.marketing-cell]:py-[52px]">
        <div className="marketing-rail relative isolate mx-auto max-w-[1186px] border border-[var(--rail-color)] max-sm:mx-4 max-[1191px]:mx-7">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <a
              href={localizePath("/", locale)}
              aria-label={content.home}
              className="marketing-text-link text-primary-text decoration-1 underline-offset-4 hover:underline"
            >
              ecentic
            </a>
            <p className="mt-16 mb-6 text-primary">404</p>
            <h1>{content.title}</h1>
            <p className="marketing-lead mt-7 max-w-[720px] text-[clamp(1.125rem,1.6vw,1.35rem)] leading-[1.55]">
              {content.description}
            </p>
          </div>
        </div>
      </section>
      <section className="marketing-band relative">
        <div className="marketing-rail relative isolate mx-auto max-w-[1186px] border border-[var(--rail-color)] max-sm:mx-4 max-[1191px]:mx-7">
          <nav
            aria-label={content.navigation}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {content.links.map((link) => (
              <a
                key={link.href}
                href={localizePath(link.href, locale)}
                className="border-accent-foreground border-r border-b px-7 py-8 text-primary text-xl hover:bg-background-dimmed"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <section className="marketing-band marketing-field relative bg-background [&>.marketing-rail]:bg-background-dimmed [&_.marketing-note]:text-foreground">
        <div className="marketing-rail relative isolate mx-auto max-w-[1186px] border border-[var(--rail-color)] max-sm:mx-4 max-[1191px]:mx-7">
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
            <h2>{content.machineTitle}</h2>
            <p>{content.machineDescription}</p>
            <nav aria-label={content.machineNavigation} className="mt-10">
              <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {RECOVERY_LINKS.map((link, index) => {
                  const copy = content.recoveryLinks[index];
                  if (!copy) return null;
                  return (
                    <li
                      key={link.href}
                      className="border-accent-foreground border-t py-5"
                    >
                      <a
                        className="marketing-text-link text-primary-text decoration-1 underline-offset-4 hover:underline"
                        href={link.href}
                      >
                        {copy.label}
                      </a>
                      <p className="mt-2 text-sm">{copy.description}</p>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <h3 className="mt-12">{content.markdownTitle}</h3>
            <a
              className="marketing-text-link mt-4 inline-block text-primary-text decoration-1 underline-offset-4 hover:underline"
              href="/404.md"
            >
              {content.markdownAction}
            </a>
            <pre className="mt-6 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
              {notFoundMarkdown()}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
};

export namespace NotFoundContent {
  export type Props = { locale: Locale };
}
