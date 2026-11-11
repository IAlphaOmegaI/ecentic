import { LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { CookieSettings } from "@/components/cookie-settings";
import { LanguageSwitcher } from "@/components/language-switcher";
import { fonts } from "@/components/marketing/fonts";
import { FooterColumns } from "@/components/marketing/footer-columns";
import {
  MarketingBand,
  MarketingClosing,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";

export const Footer = async (_props: Footer.Props = {}) => {
  const { enterpriseChrome: chrome, enterpriseNav: navigation } =
    await getMessages();
  const copy = chrome.footer;
  const group = (id: string) =>
    navigation.groups.find((entry) => entry.id === id);
  const links = (id: string, title?: string) =>
    group(id)
      ?.columns.filter((column) => !title || column.title === title)
      .flatMap((column) =>
        column.items.map(({ href, label }) => ({ href, label })),
      ) ?? [];
  const columns = [
    {
      title: copy.platform,
      links: (group("platform")?.columns ?? []).map((column, index) => ({
        label: column.title,
        href: `/platform/${["connect", "simulate", "fix", "sell", "track"][index]}`,
      })),
    },
    {
      title: copy.solutions,
      links: [
        ...(group("solutions")?.columns[0]?.items.map(({ href, label }) => ({
          href,
          label,
        })) ?? []),
        { href: "/solutions/sectors", label: copy.allSectors },
      ],
    },
    {
      title: copy.channels,
      links: [
        ...links("channels"),
        { href: "/ai-channels", label: copy.allChannels },
      ],
    },
    {
      title: copy.integrations,
      links: [
        { href: "/integrations/shopify", label: "Shopify" },
        { href: "/integrations/woocommerce", label: "WooCommerce" },
        {
          href: "/integrations/google-merchant-center",
          label: "Google Merchant Center",
        },
        {
          href: "/integrations/product-feeds",
          label: group("platform")?.columns[0]?.items[2]?.label ?? "",
        },
        { href: "/integrations", label: copy.allIntegrations },
        { href: "/integrations#request", label: copy.requestIntegration },
      ],
    },
    {
      title: copy.resources,
      links: [
        ...(group("resources")?.columns[0]?.items.map(({ href, label }) => ({
          href,
          label,
        })) ?? []),
        { href: "/tools", label: copy.tools },
        ...(group("resources")
          ?.columns[2]?.items.filter(
            (item) => item.href === "/docs" || item.href === "/changelog",
          )
          .map(({ href, label }) => ({ href, label })) ?? []),
      ],
    },
    {
      title: copy.company,
      links:
        group("resources")?.columns[3]?.items.map(({ href, label }) => ({
          href,
          label,
        })) ?? [],
    },
    {
      title: copy.legal,
      links: [
        { href: "/terms", label: copy.terms },
        { href: "/privacy-policy", label: copy.privacy },
        { href: "/security#dpa", label: copy.dpa },
        { href: "/security#sub-processors", label: copy.subProcessors },
        { href: "/ai-instructions", label: copy.aiInstructions },
      ],
    },
  ];
  return (
    <footer
      className={cn(
        fonts,
        "marketing-site marketing-footer marketing-grid-pattern text-(length:--text-base) relative left-[calc(50%-50vw)] w-screen bg-background font-body font-normal text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-xs [&_:where(input,textarea,select,[role=combobox])]:rounded-xs [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
      )}
    >
      <MarketingClosing
        title={chrome.closing.title}
        description={chrome.closing.description}
        actions={[
          { href: "/demo", label: chrome.action.primary },
          { href: "/sign-up", label: chrome.action.secondary },
        ]}
      />
      <MarketingBand>
        <div className="marketing-footer-columns hidden grid-cols-7 min-[801px]:grid">
          {columns.map((column) => (
            <nav
              className="border-accent-foreground border-r px-4 py-8 last:border-r-0 [&>button]:text-foreground"
              aria-label={column.title}
              key={column.title}
            >
              <h2 className="mb-5 font-body font-medium text-foreground-rich text-sm tracking-normal">
                {column.title}
              </h2>
              <ul>
                {column.links.map((link) => (
                  <li
                    className="my-2.5 text-[13px] leading-[1.45]"
                    key={link.href}
                  >
                    <Link className="hover:text-primary-text" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {column.title === copy.legal && (
                <CookieSettings label={copy.cookies} />
              )}
            </nav>
          ))}
        </div>
        <FooterColumns columns={columns} />
      </MarketingBand>
      <MarketingBand>
        <div className="marketing-footer-bottom flex flex-wrap items-center justify-between gap-6 px-4 py-7 sm:px-7 sm:py-8">
          <Link href="/">
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              className="h-auto w-35"
              width={1022}
              height={257}
            />
          </Link>
          <p className="max-w-90 text-[13px]">{copy.tagline}</p>
          {copy.copyright && (
            <p className="max-w-90 text-[13px]">{copy.copyright}</p>
          )}
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/company/ecentic/"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="size-4" />
            </a>
            <a href="https://x.com/ecentic_ai" aria-label="X">
              <XTwitterIcon className="size-4" />
            </a>
            <LanguageSwitcher />
          </div>
          <div className="marketing-footer-mobile block px-4 py-6 min-[801px]:hidden [&>button]:text-foreground">
            <CookieSettings label={copy.cookies} />
          </div>
        </div>
        <p className="marketing-footer-trademark px-4 pb-7 text-foreground-dimmed text-xs sm:px-7">
          {copy.trademark}
        </p>
      </MarketingBand>
    </footer>
  );
};
export namespace Footer {
  export type Props = { stacked?: boolean };
}
