import { LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { CookieSettings } from "@/components/cookie-settings";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FooterWordmark } from "@/components/marketing/ascii-wordmark";
import { fonts } from "@/components/marketing/fonts";
import { FooterColumns } from "@/components/marketing/footer-columns";
import {
  MarketingClosing,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
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
        "marketing-site marketing-footer marketing-grid-pattern text-(length:--text-base) relative left-[calc(50%-50vw)] w-screen bg-background font-body font-normal text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-md [&_:where(input,textarea,select,[role=combobox])]:rounded-md [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]",
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
      <MarketingFeatureBand
        tone="light"
        className="marketing-footer-field [&>.marketing-rail>.w-dvw]:bg-linear-to-br [&>.marketing-rail>.w-dvw]:from-0% [&>.marketing-rail>.w-dvw]:from-background-rich [&>.marketing-rail>.w-dvw]:via-40% [&>.marketing-rail>.w-dvw]:via-primary/20 [&>.marketing-rail>.w-dvw]:to-100% [&>.marketing-rail>.w-dvw]:to-primary/65 [&_button]:text-foreground-rich [&_button]:hover:text-primary-text"
      >
        <Plus className="top-12 left-0 hidden -translate-x-1/2 -translate-y-1/2 min-[801px]:block" />
        <Plus className="top-12 right-0 hidden translate-x-1/2 -translate-y-1/2 min-[801px]:block" />
        <div className="marketing-footer-columns relative hidden grid-cols-4 border-accent-foreground border-t min-[801px]:grid">
          {columns.map((column) => (
            <nav
              className="border-accent-foreground border-r nth-[4n]:border-r-0 border-b nth-[n+5]:border-b-0 px-7 py-8"
              aria-label={column.title}
              key={column.title}
            >
              <h2 className="mb-4 font-body font-medium text-primary-text text-sm tracking-normal">
                {column.title}
              </h2>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li className="text-sm leading-relaxed" key={link.href}>
                    <Link
                      className="inline-flex text-foreground-rich transition-[color,transform] duration-200 hover:translate-x-1 hover:text-primary-text hover:underline hover:underline-offset-4 motion-reduce:transform-none"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === copy.legal && (
                  <li className="text-sm leading-relaxed">
                    <CookieSettings label={copy.cookies} appearance="link" />
                  </li>
                )}
              </ul>
            </nav>
          ))}
          <div className="relative flex min-w-0 flex-col justify-between gap-8 px-7 py-8">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <FooterIdentity tagline={copy.tagline} />
            <FooterSocial />
          </div>
        </div>
        <FooterColumns columns={columns} cookies={copy.cookies} />
        <div className="flex flex-col gap-6 border-accent-foreground border-t px-4 py-8 min-[801px]:hidden">
          <FooterIdentity tagline={copy.tagline} />
          <FooterSocial />
        </div>
        <div className="relative border-accent-foreground border-y">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <FooterWordmark />
        </div>
        <div className="marketing-footer-bottom grid items-start gap-6 px-7 py-7 max-sm:px-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3 text-foreground-rich text-xs">
            <p className="marketing-footer-trademark max-w-[76ch] leading-relaxed">
              {copy.trademark}
            </p>
            {copy.copyright && <p>{copy.copyright}</p>}
          </div>
          <Suspense
            fallback={<div aria-hidden className="h-10 w-24 shrink-0" />}
          >
            <LanguageSwitcher />
          </Suspense>
        </div>
      </MarketingFeatureBand>
    </footer>
  );
};

const FooterIdentity = ({ tagline }: { tagline: string }) => (
  <div>
    <Link href="/" className="inline-flex">
      <Image
        src="/images/trademark.svg"
        alt="ecentic"
        className="h-auto w-40"
        width={1022}
        height={257}
      />
    </Link>
    <p className="mt-4 max-w-[40ch] text-foreground-rich text-sm">{tagline}</p>
  </div>
);

const FooterSocial = () => (
  <div className="flex items-center gap-6">
    <a
      href="https://www.linkedin.com/company/ecentic/"
      aria-label="LinkedIn"
      className="inline-grid size-10 place-items-center text-primary-text transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
    >
      <LinkedinIcon className="size-6" />
    </a>
    <a
      href="https://x.com/ecentic_ai"
      aria-label="X"
      className="inline-grid size-10 place-items-center text-primary-text transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
    >
      <XTwitterIcon className="size-6" />
    </a>
  </div>
);

export namespace Footer {
  export type Props = { stacked?: boolean };
}
