import { LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { CookieSettings } from "@/components/cookie-settings";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FooterColumns } from "@/components/marketing/footer-columns";
import {
  MarketingBand,
  MarketingClosing,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import "./marketing/navigation.css";

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
    <footer className="marketing-site marketing-footer">
      <MarketingClosing
        title={chrome.closing.title}
        description={chrome.closing.description}
        actions={[
          { href: "/demo", label: chrome.action.primary },
          { href: "/sign-up", label: chrome.action.secondary },
        ]}
      />
      <MarketingBand>
        <div className="marketing-footer-columns">
          {columns.map((column) => (
            <nav aria-label={column.title} key={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
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
        <div className="marketing-footer-bottom">
          <Link href="/">
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              style={{ width: 140, height: "auto" }}
              width={1022}
              height={257}
            />
          </Link>
          <p>{copy.tagline}</p>
          <p>{copy.copyright}</p>
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
          <div className="marketing-footer-mobile">
            <CookieSettings label={copy.cookies} />
          </div>
        </div>
        <p className="marketing-footer-trademark">{copy.trademark}</p>
      </MarketingBand>
    </footer>
  );
};
export namespace Footer {
  export type Props = { stacked?: boolean };
}
