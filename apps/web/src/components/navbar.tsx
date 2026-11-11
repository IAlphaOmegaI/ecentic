"use client";

import { ArrowRightIcon, ChevronDownIcon, MenuIcon } from "@zenncore/icons";
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
import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
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
};

export const Navbar = () => {
  const messages = useMessages();
  const chrome = messages.enterpriseChrome;
  const navigation = messages.enterpriseNav;
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const navigationOpen = mobile || active !== null;
  useEffect(() => {
    if (!navigationOpen) return;
    const supportWindow = window as Window & {
      $chatwoot?: {
        hasLoaded: boolean;
        hideMessageBubble: boolean;
        toggleBubbleVisibility: (visibility: "hide" | "show") => void;
      };
    };
    const previousVisibility: { hidden?: boolean } = {};
    const hideSupportBubble = () => {
      const widget = supportWindow.$chatwoot;
      if (!widget?.hasLoaded) return;
      previousVisibility.hidden ??= widget.hideMessageBubble;
      widget.toggleBubbleVisibility("hide");
    };
    window.addEventListener("chatwoot:ready", hideSupportBubble);
    hideSupportBubble();
    return () => {
      window.removeEventListener("chatwoot:ready", hideSupportBubble);
      if (previousVisibility.hidden === undefined) return;
      supportWindow.$chatwoot?.toggleBubbleVisibility(
        previousVisibility.hidden ? "hide" : "show",
      );
    };
  }, [navigationOpen]);
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
                      className="marketing-nav-trigger marketing-nav-pricing h-11 rounded-xs bg-transparent px-2 xs:px-2 py-3 text-sm hover:bg-transparent hover:text-primary-text focus-visible:text-primary-text"
                    >
                      {navigation.pricing}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem key={group.id} value={group.id}>
                  <NavigationMenuTrigger
                    className="marketing-nav-trigger h-11 rounded-xs bg-transparent px-2 xs:px-2 py-3 text-sm xs:text-sm hover:bg-transparent hover:text-primary-text focus-visible:text-primary-text data-popup-open:bg-transparent data-popup-open:text-primary-text"
                    data-menu-trigger={group.id}
                    onKeyDown={(event) => {
                      if (!["ArrowDown", "Enter", " "].includes(event.key))
                        return;
                      event.preventDefault();
                      event.preventBaseUIHandler();
                      event.stopPropagation();
                      setActive(group.id);
                      focusMenu(group.id);
                    }}
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
                    onKeyDown={(event) => {
                      moveWithin(event);
                      if (event.defaultPrevented) event.preventBaseUIHandler();
                    }}
                  >
                    <div
                      className="marketing-nav-grid relative mx-auto grid max-w-[min(1186px,calc(100%-56px))] grid-cols-[repeat(var(--menu-columns),minmax(0,1fr))] gap-px border border-accent-foreground bg-accent-foreground [grid-template-rows:minmax(3rem,auto)_repeat(var(--menu-rows),minmax(6rem,auto))]"
                      data-menu={group.id}
                      style={
                        {
                          "--menu-columns":
                            group.id === "channels" ? 3 : group.columns.length,
                          "--menu-rows":
                            group.id === "channels"
                              ? 2
                              : Math.max(
                                  ...group.columns.map(
                                    (column) => column.items.length,
                                  ),
                                ),
                          "--menu-span":
                            group.id === "channels"
                              ? 3
                              : Math.max(
                                  ...group.columns.map(
                                    (column) => column.items.length,
                                  ),
                                ) + 1,
                        } as CSSProperties
                      }
                    >
                      {group.columns.map((column, columnIndex) => (
                        <div
                          className={cn(
                            "marketing-nav-column relative grid grid-rows-subgrid gap-px [grid-row:span_var(--menu-span)]",
                            group.id === "channels" &&
                              "col-span-3 grid-cols-subgrid",
                          )}
                          key={column.title}
                        >
                          <p className="marketing-nav-column-heading relative col-span-full flex items-center bg-background-dimmed px-5 py-3 font-medium text-foreground-dimmed text-sm leading-snug">
                            {column.title}
                          </p>
                          {column.items.map((item, itemIndex) => {
                            const provider =
                              group.id === "channels"
                                ? navigationProviders[item.href]
                                : undefined;
                            return (
                              <NavigationMenuLink
                                key={`${item.href}-${item.label}`}
                                data-junction-left={
                                  group.id === "channels"
                                    ? itemIndex % 3 === 0
                                    : columnIndex === 0 ||
                                      itemIndex >=
                                        (group.columns[columnIndex - 1]?.items
                                          .length ?? 0)
                                }
                                render={<Link href={item.href} />}
                                onClick={() => setActive(null)}
                                className="marketing-nav-cell group/nav-cell relative flex min-w-0 items-start gap-3 rounded-none bg-background px-5 xs:px-5 py-4 xs:py-4 text-sm leading-snug hover:bg-background-rich hover:text-primary-text focus-visible:bg-background-rich focus-visible:text-primary-text focus-visible:-outline-offset-4 [&_.marketing-status]:mt-2 [&_.marketing-status]:text-xs"
                              >
                                {provider && (
                                  <ProviderLogo
                                    provider={provider}
                                    className="marketing-nav-provider mt-0.5 size-6 shrink-0 object-contain"
                                  />
                                )}
                                <span>
                                  <span className="marketing-mega-label block font-medium text-foreground-rich group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                                    {item.label}
                                  </span>
                                  <span className="marketing-mega-description mt-1.5 block text-foreground-dimmed text-xs leading-relaxed group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
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
                          {column.items.length <
                            Math.max(
                              ...group.columns.map(
                                (entry) => entry.items.length,
                              ),
                            ) && (
                            <div
                              aria-hidden="true"
                              className="marketing-nav-empty bg-background"
                              style={{
                                gridRow: `span ${
                                  Math.max(
                                    ...group.columns.map(
                                      (entry) => entry.items.length,
                                    ),
                                  ) - column.items.length
                                }`,
                              }}
                            />
                          )}
                        </div>
                      ))}
                      <NavigationMenuLink
                        render={<Link href={group.featured.href} />}
                        onClick={() => setActive(null)}
                        className="marketing-nav-feature-cell marketing-nav-cell group/nav-cell relative col-span-full flex items-center justify-between gap-6 rounded-none bg-background px-5 xs:px-5 py-4 xs:py-4 text-sm leading-snug hover:bg-background-rich hover:text-primary-text focus-visible:bg-background-rich focus-visible:text-primary-text focus-visible:-outline-offset-4"
                      >
                        <span>
                          <span className="block font-medium text-foreground-rich group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                            {group.featured.title}
                          </span>
                          <span className="mt-1.5 block text-foreground-dimmed text-xs leading-relaxed group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                            {group.featured.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 font-medium text-primary-text">
                          {chrome.action.quaternary}
                          <ArrowRightIcon aria-hidden className="size-4" />
                        </span>
                      </NavigationMenuLink>
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
              variant="soft"
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
                "marketing-site marketing-grid-pattern marketing-mobile-sheet h-dvh w-screen max-w-none gap-6 overflow-y-auto border-0 bg-background px-6 py-7 font-body font-normal text-foreground [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] sm:max-w-none",
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
                <Accordion
                  multiple
                  className="marketing-mobile-menu-grid border border-accent-foreground bg-background"
                >
                  {navigation.groups.map((group) => (
                    <AccordionItem
                      key={group.id}
                      value={group.id}
                      className="border-accent-foreground last:border-b-0"
                    >
                      <AccordionTrigger className="marketing-mobile-nav-trigger min-h-15 items-center px-4 py-4 font-body text-base hover:text-primary-text focus-visible:text-primary-text focus-visible:-outline-offset-4">
                        {group.label}
                      </AccordionTrigger>
                      <AccordionPanel className="data-open:overflow-visible">
                        <div className="marketing-mobile-nav-grid grid gap-px border-accent-foreground border-t bg-accent-foreground">
                          {group.columns.map((column) => (
                            <div className="grid gap-px" key={column.title}>
                              <p className="marketing-nav-column-heading relative bg-background-dimmed px-4 py-3 font-medium text-foreground-dimmed text-sm">
                                {column.title}
                              </p>
                              {column.items.map((item) => {
                                const provider =
                                  group.id === "channels"
                                    ? navigationProviders[item.href]
                                    : undefined;
                                return (
                                  <SheetClose
                                    nativeButton={false}
                                    role="link"
                                    key={`${item.href}-${item.label}`}
                                    render={<Link href={item.href} />}
                                    className="marketing-mobile-nav-cell group/nav-cell relative flex min-h-24 min-w-0 items-start gap-3 bg-background px-4 py-4 text-sm leading-snug hover:bg-background-rich hover:text-primary-text focus-visible:bg-background-rich focus-visible:text-primary-text focus-visible:-outline-offset-4 [&_.marketing-status]:mt-2 [&_.marketing-status]:text-xs"
                                  >
                                    {provider && (
                                      <ProviderLogo
                                        provider={provider}
                                        className="marketing-nav-provider mt-0.5 size-6 shrink-0 object-contain"
                                      />
                                    )}
                                    <span>
                                      <span className="block font-medium text-foreground-rich group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                                        {item.label}
                                      </span>
                                      <span className="mt-1.5 block text-foreground-dimmed text-xs leading-relaxed group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                                        {item.description}
                                      </span>
                                      {item.status && (
                                        <MarketingStatus status={item.status}>
                                          {statusLabel(item.status)}
                                        </MarketingStatus>
                                      )}
                                    </span>
                                  </SheetClose>
                                );
                              })}
                            </div>
                          ))}
                          <SheetClose
                            nativeButton={false}
                            role="link"
                            render={<Link href={group.featured.href} />}
                            className="marketing-mobile-nav-cell group/nav-cell relative flex min-h-24 min-w-0 items-start justify-between gap-4 bg-background px-4 py-4 text-sm leading-snug hover:bg-background-rich hover:text-primary-text focus-visible:bg-background-rich focus-visible:text-primary-text focus-visible:-outline-offset-4"
                          >
                            <span>
                              <span className="block font-medium text-foreground-rich group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                                {group.featured.title}
                              </span>
                              <span className="mt-1.5 block text-foreground-dimmed text-xs leading-relaxed group-hover/nav-cell:text-primary-text group-focus-visible/nav-cell:text-primary-text">
                                {group.featured.description}
                              </span>
                            </span>
                            <ArrowRightIcon
                              aria-hidden
                              className="mt-0.5 size-4 shrink-0 text-primary-text"
                            />
                          </SheetClose>
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </nav>
              <div className="marketing-mobile-action-grid grid grid-cols-1 gap-px border border-accent-foreground bg-accent-foreground sm:grid-cols-2">
                <SheetClose
                  nativeButton={false}
                  role="link"
                  render={<Link href="/pricing" />}
                  className="marketing-mobile-nav-cell relative col-span-full flex min-h-15 items-center bg-background px-4 py-4 font-medium text-base text-foreground-rich hover:bg-background-rich hover:text-primary-text focus-visible:text-primary-text"
                >
                  {navigation.pricing}
                </SheetClose>
                <div className="bg-background p-4">
                  <Button
                    variant="soft"
                    color="emphasis"
                    className="w-full"
                    render={
                      <Link href="/sign-in" onClick={() => setMobile(false)} />
                    }
                  >
                    {chrome.action.tertiary}
                  </Button>
                </div>
                <div className="bg-background p-4">
                  <Button
                    className="w-full"
                    render={
                      <Link href="/sign-up" onClick={() => setMobile(false)} />
                    }
                  >
                    {chrome.action.secondary}
                  </Button>
                </div>
                <div className="col-span-full bg-background p-4">
                  <LanguageSwitcher />
                </div>
              </div>
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
