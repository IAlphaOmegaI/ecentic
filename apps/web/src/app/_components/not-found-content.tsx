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

export const NotFoundContent = async ({ locale }: { locale: Locale }) => {
  const { enterpriseRecovery } = await getMessages({ locale });
  const content = enterpriseRecovery.notFound;
  return (
    <main id="main-content">
      <section className="marketing-band marketing-hero">
        <div className="marketing-rail">
          <div className="marketing-cell">
            <a
              href={localizePath("/", locale)}
              aria-label={content.home}
              className="marketing-text-link"
            >
              ecentic
            </a>
            <p className="mt-16 mb-6 text-primary">404</p>
            <h1>{content.title}</h1>
            <p className="marketing-lead">{content.description}</p>
          </div>
        </div>
      </section>
      <section className="marketing-band">
        <div className="marketing-rail">
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
      <section className="marketing-band marketing-field">
        <div className="marketing-rail">
          <div className="marketing-cell">
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
                      <a className="marketing-text-link" href={link.href}>
                        {copy.label}
                      </a>
                      <p className="mt-2 text-sm">{copy.description}</p>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <h3 className="mt-12">{content.markdownTitle}</h3>
            <a className="marketing-text-link mt-4 inline-block" href="/404.md">
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
