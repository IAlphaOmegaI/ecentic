"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  CommerceBasketShoppingIcon,
  CommerceBookOpenIcon,
  CommerceChartActivity_2Icon,
  CommerceCityBuildingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
  MenuIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@zenncore/web/components/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@zenncore/web/components/sheet";
import Image from "next/image";
import { useMessages } from "next-intl";
import { Fragment, type KeyboardEvent, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MarketingStatus } from "@/components/marketing/primitives";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";
import { Link, usePathname } from "@/i18n/navigation";
import "./marketing/navigation.css";

const navigationProviders: Record<string, ProviderKey> = {
  "/ai-channels/google-ai-mode-gemini": "google",
  "/ai-channels/chatgpt": "chatgpt",
  "/ai-channels/claude": "claude",
  "/ai-channels/microsoft-copilot": "copilot",
  "/ai-channels/perplexity": "perplexity",
  "/ai-channels/amazon": "amazon",
  "/integrations/shopify": "shopify",
  "/integrations/google-merchant-center": "googleMerchant",
};

const navigationIcon = (href: string) => {
  switch (true) {
    case href.startsWith("/platform/connect"):
    case href.startsWith("/integrations"):
      return CommercePlug_3SparkleIcon;
    case href.startsWith("/platform/simulate"):
      return CommerceChartActivity_2Icon;
    case href.startsWith("/platform/fix"):
      return CommerceFilePenIcon;
    case href.startsWith("/platform/sell"):
      return CommerceBasketShoppingIcon;
    case href.startsWith("/platform/track"):
    case href.startsWith("/ai-channels"):
      return CommerceGlobePointerIcon;
    case href.startsWith("/solutions"):
    case href.startsWith("/about"):
    case href.startsWith("/partners"):
      return CommerceCityBuildingIcon;
    case href.startsWith("/security"):
      return CommerceFileShieldIcon;
    case href.startsWith("/docs"):
      return CommerceCode_3Icon;
    default:
      return CommerceBookOpenIcon;
  }
};

export const Navbar = () => {
  const messages = useMessages();
  const chrome = messages.enterpriseChrome;
  const navigation = messages.enterpriseNav;
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const header = useRef<HTMLElement>(null);
  const navigationRow = useRef<HTMLDivElement>(null);
  const menuSurface = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const statusLabels = {
    live: chrome.status.live,
    feed: chrome.status.feed,
    soon: chrome.status.soon,
    simulated: chrome.status.simulated,
  };
  const statusLabel = (status: string) =>
    Object.entries(statusLabels).find(([key]) => key === status)?.[1] ?? status;
  const focusMenu = (menu: string) => {
    pendingFocus.current = menu;
    requestAnimationFrame(() => {
      if (pendingFocus.current !== menu) return;
      const link = document.querySelector<HTMLAnchorElement>(
        `.marketing-mega-content[data-menu="${menu}"] a[href]`,
      );
      if (!link) return;
      link.focus();
      pendingFocus.current = null;
    });
  };
  const moveWithin = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      pendingFocus.current = null;
      setActive(null);
      header.current
        ?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${active}"]`)
        ?.focus();
      return;
    }
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowRight",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    const links = [
      ...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[href]"),
    ];
    const current = links.indexOf(event.target as HTMLAnchorElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : (current +
              (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1) +
              links.length) %
            links.length;
    if (!links[next]) return;
    event.preventDefault();
    event.stopPropagation();
    links[next].focus();
  };
  return (
    <header className="marketing-site marketing-nav" ref={header}>
      <div aria-hidden="true" className="marketing-nav-blur">
        <span />
        <span />
        <span />
      </div>
      <div className="marketing-nav-inner" ref={navigationRow}>
        <Link
          href="/"
          aria-label={navigation.home}
          className="marketing-nav-logo"
        >
          <Image
            src="/images/trademark.svg"
            width={1022}
            height={257}
            alt="ecentic"
            style={{ width: 140, height: "auto" }}
            priority
          />
        </Link>
        <NavigationMenu
          className="marketing-desktop-nav"
          value={active}
          onValueChange={(value) =>
            setActive(typeof value === "string" ? value : null)
          }
          delay={120}
          closeDelay={120}
        >
          <NavigationMenuList>
            {navigation.groups.map((group) => (
              <Fragment key={group.id}>
                {group.id === "resources" && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      render={
                        <Link
                          href="/pricing"
                          aria-current={
                            pathname === "/pricing" ? "page" : undefined
                          }
                        />
                      }
                      className="marketing-nav-trigger marketing-nav-pricing"
                    >
                      {navigation.pricing}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem key={group.id} value={group.id}>
                  <NavigationMenuTrigger
                    className="marketing-nav-trigger"
                    data-menu-trigger={group.id}
                    onClick={(event) => {
                      event.preventDefault();
                      setActive(group.id);
                      focusMenu(group.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowDown") return;
                      event.preventDefault();
                      setActive(group.id);
                      focusMenu(group.id);
                    }}
                  >
                    {group.label}
                    <ChevronDownIcon className="size-4" />
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    className="marketing-mega-content"
                    data-menu={group.id}
                    ref={(content) => {
                      if (!content || pendingFocus.current !== group.id) return;
                      content
                        .querySelector<HTMLAnchorElement>("a[href]")
                        ?.focus();
                      pendingFocus.current = null;
                    }}
                    onKeyDown={moveWithin}
                  >
                    <div className="marketing-mega-grid" data-menu={group.id}>
                      {group.columns.map((column) => (
                        <div
                          className="marketing-mega-column"
                          key={column.title}
                        >
                          <p className="marketing-mega-heading">
                            {column.title}
                          </p>
                          {column.items.map((item) => {
                            const Icon = navigationIcon(item.href);
                            const provider = navigationProviders[item.href];
                            return (
                              <NavigationMenuLink
                                key={`${item.href}-${item.label}`}
                                render={<Link href={item.href} />}
                                onClick={() => setActive(null)}
                                className="marketing-mega-link"
                              >
                                {provider ? (
                                  <ProviderLogo
                                    provider={provider}
                                    className="marketing-nav-provider"
                                  />
                                ) : (
                                  <Icon
                                    aria-hidden
                                    className="size-4 text-primary"
                                  />
                                )}
                                <span>
                                  <span className="marketing-mega-label">
                                    {item.label}
                                  </span>
                                  <span className="marketing-mega-description">
                                    {item.description}
                                  </span>
                                  {item.status && (
                                    <MarketingStatus status={item.status}>
                                      {statusLabel(item.status)}
                                    </MarketingStatus>
                                  )}
                                </span>
                              </NavigationMenuLink>
                            );
                          })}
                        </div>
                      ))}
                      <div className="marketing-mega-feature">
                        <p>{group.featured.title}</p>
                        <p>{group.featured.description}</p>
                        <NavigationMenuLink
                          render={<Link href={group.featured.href} />}
                          onClick={() => setActive(null)}
                          className="marketing-text-link"
                        >
                          {chrome.action.quaternary}
                          <ArrowRightIcon className="size-4" />
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </Fragment>
            ))}
          </NavigationMenuList>
          <NavigationMenuPositioner
            className="marketing-site marketing-mega-positioner"
            container={menuSurface}
            anchor={navigationRow}
            sideOffset={0}
            align="center"
            collisionPadding={0}
          >
            <NavigationMenuPopup className="marketing-mega-popup">
              <NavigationMenuViewport />
            </NavigationMenuPopup>
          </NavigationMenuPositioner>
        </NavigationMenu>
        <div className="marketing-nav-end">
          <div className="marketing-desktop-locale">
            <LanguageSwitcher />
          </div>
          <Link className="marketing-nav-login" href="/sign-in">
            {chrome.action.tertiary}
          </Link>
          <div className="marketing-actions">
            <Button variant="flat" render={<Link href="/demo" />}>
              {chrome.action.primary}
            </Button>
          </div>
        </div>
        <div className="marketing-mobile-nav">
          <Sheet open={mobile} onOpenChange={setMobile}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" />}
              aria-label={chrome.menu.open}
            >
              <MenuIcon className="size-4" />
            </SheetTrigger>
            <SheetPopup
              className="marketing-site marketing-mobile-sheet"
              classList={{ close: { root: "marketing-sheet-close" } }}
            >
              <SheetHeader>
                <SheetTitle>
                  <Image
                    src="/images/trademark.svg"
                    width={1022}
                    height={257}
                    alt="ecentic"
                    style={{ width: 140, height: "auto" }}
                  />
                </SheetTitle>
                <SheetDescription>{chrome.menu.title}</SheetDescription>
              </SheetHeader>
              <nav aria-label={chrome.menu.title}>
                <Accordion multiple>
                  {navigation.groups.map((group) => (
                    <AccordionItem key={group.id} value={group.id}>
                      <AccordionTrigger>{group.label}</AccordionTrigger>
                      <AccordionPanel>
                        <div className="marketing-mobile-columns">
                          {group.columns.map((column) => (
                            <div key={column.title}>
                              <p className="marketing-mega-heading">
                                {column.title}
                              </p>
                              {column.items.map((item) => (
                                <SheetClose
                                  nativeButton={false}
                                  role="link"
                                  key={`${item.href}-${item.label}`}
                                  render={<Link href={item.href} />}
                                  className="marketing-mobile-link"
                                >
                                  {item.label}
                                  {item.status && (
                                    <MarketingStatus status={item.status}>
                                      {statusLabel(item.status)}
                                    </MarketingStatus>
                                  )}
                                </SheetClose>
                              ))}
                            </div>
                          ))}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </nav>
              <SheetClose
                nativeButton={false}
                role="link"
                render={<Link href="/pricing" />}
                className="marketing-mobile-link"
              >
                {navigation.pricing}
              </SheetClose>
              <SheetClose
                nativeButton={false}
                role="link"
                render={<Link href="/sign-in" />}
                className="marketing-mobile-link"
              >
                {chrome.action.tertiary}
              </SheetClose>
              <div className="marketing-actions">
                <Button
                  variant="flat"
                  render={
                    <Link href="/sign-up" onClick={() => setMobile(false)} />
                  }
                >
                  {chrome.action.secondary}
                </Button>
              </div>
              <LanguageSwitcher />
            </SheetPopup>
          </Sheet>
        </div>
      </div>
      <div ref={menuSurface} className="marketing-menu-surface" />
    </header>
  );
};
