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
import { cn } from "@zenncore/utils";
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
import { fonts } from "@/components/marketing/fonts";
import { MarketingStatus } from "@/components/marketing/primitives";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";
import { Link, usePathname } from "@/i18n/navigation";

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
      link.focus({ preventScroll: true });
      if (document.activeElement === link) pendingFocus.current = null;
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
        ?.focus({ preventScroll: true });
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
    links[next].focus({ preventScroll: true });
    const bounds = event.currentTarget.getBoundingClientRect();
    const target = links[next].getBoundingClientRect();
    const offset =
      Math.min(0, target.top - bounds.top) +
      Math.max(0, target.bottom - bounds.bottom);
    if (offset !== 0)
      event.currentTarget.scrollBy({ top: offset, behavior: "instant" });
  };
  return (
    <header
      data-menu-open={active !== null}
      className={cn(
        fonts,
        "marketing-site marketing-nav marketing-grid-pattern sticky top-0 isolate z-60 shrink-0 bg-transparent font-body font-normal text-foreground [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)]",
      )}
      ref={header}
    >
      <div
        aria-hidden="true"
        className="marketing-nav-blur pointer-events-none absolute inset-x-0 top-0 -bottom-12 -z-1 bg-linear-to-b from-background/90 via-40% via-background/70 to-transparent"
      >
        <span className="absolute inset-0 backdrop-blur-[24px] [mask-image:linear-gradient(to_bottom,black_0%,black_16%,transparent_40%)]" />
        <span className="absolute inset-0 backdrop-blur-[16px] [mask-image:linear-gradient(to_bottom,transparent_8%,black_20%,black_32%,transparent_52%)]" />
        <span className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,transparent_26%,black_38%,black_48%,transparent_68%)]" />
        <span className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent_42%,black_56%,black_62%,transparent_80%)]" />
        <span className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_60%,black_72%,black_78%,transparent_94%)]" />
        <span className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent_78%,black_88%,transparent_100%)]" />
      </div>
      <div
        className="marketing-nav-inner mx-auto flex h-20 max-w-[1440px] items-center gap-3 px-4 sm:gap-5 sm:px-7"
        ref={navigationRow}
      >
        <Link
          href="/"
          aria-label={navigation.home}
          className="marketing-nav-logo shrink-0"
        >
          <Image
            src="/images/trademark.svg"
            width={1022}
            height={257}
            alt="ecentic"
            className="h-auto w-26 sm:w-35"
            priority
          />
        </Link>
        <NavigationMenu
          className="marketing-desktop-nav ml-auto hidden min-w-0 bg-transparent p-0 min-[1151px]:block"
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
                      className="marketing-nav-trigger marketing-nav-pricing h-11 rounded-[2px] bg-transparent px-2 xs:px-2 py-3 text-sm"
                    >
                      {navigation.pricing}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem key={group.id} value={group.id}>
                  <NavigationMenuTrigger
                    className="marketing-nav-trigger h-11 rounded-[2px] bg-transparent px-2 xs:px-2 py-3 text-sm xs:text-sm"
                    data-menu-trigger={group.id}
                    onClick={(event) => {
                      event.preventDefault();
                      setActive(group.id);
                      focusMenu(group.id);
                    }}
                  >
                    {group.label}
                    <ChevronDownIcon
                      aria-hidden
                      className="size-4 scale-75 opacity-70"
                    />
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    className="marketing-mega-content max-h-[calc(100dvh-80px)] w-screen xs:w-screen min-w-0 xs:min-w-0 overflow-y-auto px-0 py-2"
                    data-menu={group.id}
                    ref={(content) => {
                      if (!content || pendingFocus.current !== group.id) return;
                      const link =
                        content.querySelector<HTMLAnchorElement>("a[href]");
                      link?.focus({ preventScroll: true });
                      if (document.activeElement === link)
                        pendingFocus.current = null;
                    }}
                    onKeyDown={moveWithin}
                  >
                    <div
                      className={cn(
                        "marketing-mega-grid relative mx-auto grid max-w-[min(1186px,calc(100%-56px))] auto-cols-fr grid-flow-col border border-accent-foreground",
                        group.id === "channels" &&
                          "grid-flow-row grid-cols-[2fr_1fr]",
                      )}
                      data-menu={group.id}
                    >
                      {group.columns.map((column) => (
                        <div
                          className={cn(
                            "marketing-mega-column relative border-accent-foreground border-r px-7 py-8",
                            group.id === "channels" &&
                              "grid grid-cols-2 gap-x-7",
                          )}
                          key={column.title}
                        >
                          <p className="marketing-mega-heading col-span-full mb-4 font-medium text-[13px] text-foreground-dimmed">
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
                                className="marketing-mega-link flex items-start gap-2 px-0 xs:px-0 py-2.5 xs:py-2.5 text-[13px] [&_.marketing-status]:mt-1 [&_.marketing-status]:text-[11px]"
                              >
                                {provider ? (
                                  <ProviderLogo
                                    provider={provider}
                                    className="marketing-nav-provider mt-0.5 size-5.5 shrink-0 object-contain"
                                  />
                                ) : (
                                  <Icon
                                    aria-hidden
                                    className="mt-1 size-4 shrink-0 text-primary"
                                  />
                                )}
                                <span>
                                  <span className="marketing-mega-label block font-medium text-foreground-rich">
                                    {item.label}
                                  </span>
                                  <span className="marketing-mega-description mt-1 block text-foreground-dimmed text-xs leading-[1.45]">
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
                      <div className="marketing-mega-feature relative bg-background-dimmed px-7 py-8">
                        <p className="font-heading font-medium text-2xl text-foreground-rich leading-[1.15]">
                          {group.featured.title}
                        </p>
                        <p className="mt-5 text-sm">
                          {group.featured.description}
                        </p>
                        <NavigationMenuLink
                          render={<Link href={group.featured.href} />}
                          onClick={() => setActive(null)}
                          className="marketing-text-link mt-6 flex items-center gap-2 p-0 xs:p-0 text-primary-text"
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
            className="marketing-site marketing-mega-positioner relative! transform-none! inset-auto! z-59 w-screen max-w-screen bg-transparent transition-none"
            container={menuSurface}
            anchor={navigationRow}
            sideOffset={0}
            align="center"
            collisionPadding={0}
          >
            <NavigationMenuPopup className="marketing-mega-popup w-screen xs:w-screen transform-none overflow-visible rounded-none border-0 bg-transparent shadow-none transition-opacity duration-150 data-ending-style:scale-100 data-starting-style:scale-100 min-[500px]:w-screen">
              <NavigationMenuViewport />
            </NavigationMenuPopup>
          </NavigationMenuPositioner>
        </NavigationMenu>
        <div className="marketing-nav-end ml-auto flex shrink-0 items-center gap-4 min-[1151px]:ml-0">
          <div className="marketing-desktop-locale hidden min-[1151px]:block">
            <LanguageSwitcher />
          </div>
          <div className="marketing-nav-login hidden min-[1151px]:block">
            <Button
              variant="outline"
              color="emphasis"
              render={<Link href="/sign-in" />}
            >
              {chrome.action.tertiary}
            </Button>
          </div>
          <Button render={<Link href="/demo" />}>
            {chrome.action.primary}
          </Button>
        </div>
        <div className="marketing-mobile-nav block min-[1151px]:hidden">
          <Sheet open={mobile} onOpenChange={setMobile}>
            <SheetTrigger
              render={<Button variant="ghost" color="emphasis" size="icon" />}
              aria-label={chrome.menu.open}
            >
              <MenuIcon className="size-4" />
            </SheetTrigger>
            <SheetPopup
              className={cn(
                fonts,
                "marketing-site marketing-mobile-sheet h-dvh w-screen max-w-none gap-6 overflow-y-auto border-0 bg-background px-6 py-7 font-body font-normal text-foreground sm:max-w-none",
              )}
              classList={{ close: { root: "marketing-sheet-close" } }}
            >
              <SheetHeader className="items-start text-left">
                <SheetTitle>
                  <Image
                    src="/images/trademark.svg"
                    width={1022}
                    height={257}
                    alt="ecentic"
                    className="h-auto w-35"
                  />
                </SheetTitle>
                <SheetDescription>{chrome.menu.title}</SheetDescription>
              </SheetHeader>
              <nav aria-label={chrome.menu.title}>
                <Accordion multiple>
                  {navigation.groups.map((group) => (
                    <AccordionItem key={group.id} value={group.id}>
                      <AccordionTrigger className="font-body">
                        {group.label}
                      </AccordionTrigger>
                      <AccordionPanel>
                        <div className="marketing-mobile-columns grid gap-6 py-4">
                          {group.columns.map((column) => (
                            <div key={column.title}>
                              <p className="marketing-mega-heading mb-4 font-medium text-[13px] text-foreground-dimmed">
                                {column.title}
                              </p>
                              {column.items.map((item) => (
                                <SheetClose
                                  nativeButton={false}
                                  role="link"
                                  key={`${item.href}-${item.label}`}
                                  render={<Link href={item.href} />}
                                  className="marketing-mobile-link flex items-center justify-between py-2.5 text-base text-foreground-rich"
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
                className="marketing-mobile-link flex items-center justify-between py-2.5 text-base text-foreground-rich"
              >
                {navigation.pricing}
              </SheetClose>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="outline"
                  color="emphasis"
                  render={
                    <Link href="/sign-in" onClick={() => setMobile(false)} />
                  }
                >
                  {chrome.action.tertiary}
                </Button>
                <Button
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
      <div
        ref={menuSurface}
        className="marketing-menu-surface hidden min-[1151px]:block"
      />
    </header>
  );
};
