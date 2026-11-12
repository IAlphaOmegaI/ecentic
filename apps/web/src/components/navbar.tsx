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
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
  CreditCardIcon,
  FileIcon,
  HammerIcon,
  MenuIcon,
  RobotIcon,
  ShoppingCartIcon,
  UserIcon,
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
import { Plus } from "@/components/plus";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./navbar.module.css";

const navigationProviders: Record<string, ProviderKey> = {
  "/ai-channels/google-ai-mode-gemini": "google",
  "/ai-channels/chatgpt": "chatgpt",
  "/ai-channels/claude": "claude",
  "/ai-channels/microsoft-copilot": "copilot",
  "/ai-channels/perplexity": "perplexity",
  "/ai-channels/amazon": "amazon",
};

const navigationCategoryIcons: Record<
  string,
  (typeof CommercePlug_3SparkleIcon)[]
> = {
  platform: [
    CommercePlug_3SparkleIcon,
    RobotIcon,
    CommerceFilePenIcon,
    CommerceBasketShoppingIcon,
    CommerceChartActivity_2Icon,
  ],
  solutions: [CommerceCityBuildingIcon, UserIcon, ShoppingCartIcon],
  channels: [CommerceGlobePointerIcon],
  integrations: [
    CommercePlug_3SparkleIcon,
    FileIcon,
    CommerceFilePenIcon,
    CreditCardIcon,
  ],
  resources: [
    CommerceBookOpenIcon,
    HammerIcon,
    CommerceCode_3Icon,
    CommerceCityBuildingIcon,
  ],
};

const NavigationCategoryIcon = ({
  group,
  column,
}: {
  group: string;
  column: number;
}) => {
  const Icon = navigationCategoryIcons[group]?.[column];
  if (!Icon) return null;
  return <Icon aria-hidden className="size-4 shrink-0" />;
};

const NavigationBlur = ({
  className,
  dark,
  expanded = false,
}: {
  className: string;
  dark: boolean;
  expanded?: boolean;
}) => (
  <div
    aria-hidden="true"
    className={cn("marketing-nav-blur pointer-events-none", className)}
  >
    <span
      className={cn(
        "absolute inset-0 bg-linear-to-b from-background/95 via-40% via-background/80 to-transparent transition-opacity duration-250 motion-reduce:transition-none",
        dark ? "opacity-0" : "opacity-100",
        expanded && "via-[calc(100%-48px)]",
      )}
    />
    <span
      className={cn(
        "absolute inset-0 bg-linear-to-b from-emphasis-dimmed/95 via-40% via-emphasis-dimmed/85 to-transparent transition-opacity duration-250 motion-reduce:transition-none",
        dark ? "opacity-100" : "opacity-0",
        expanded && "via-[calc(100%-48px)]",
      )}
    />
    <span className="absolute inset-0 backdrop-blur-[24px] [mask-image:linear-gradient(to_bottom,black_0%,black_16%,transparent_40%)]" />
    <span className="absolute inset-0 backdrop-blur-[16px] [mask-image:linear-gradient(to_bottom,transparent_8%,black_20%,black_32%,transparent_52%)]" />
    <span className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,transparent_26%,black_38%,black_48%,transparent_68%)]" />
    <span className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent_42%,black_56%,black_62%,transparent_80%)]" />
    <span className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_60%,black_72%,black_78%,transparent_94%)]" />
    <span className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent_78%,black_88%,transparent_100%)]" />
  </div>
);

const NavigationWordmark = ({ dark }: { dark: boolean }) => (
  <span className="relative block w-26 sm:w-35">
    <Image
      src="/images/trademark.svg"
      width={1022}
      height={257}
      alt="ecentic"
      className={cn(
        "h-auto w-full transition-opacity duration-250 motion-reduce:transition-none",
        dark ? "opacity-0" : "opacity-100",
      )}
      priority
    />
    <Image
      src="/images/marketing/trademark-on-dark.svg"
      width={1022}
      height={257}
      alt=""
      aria-hidden="true"
      className={cn(
        "absolute inset-0 h-auto w-full transition-opacity duration-250 motion-reduce:transition-none",
        dark ? "opacity-100" : "opacity-0",
      )}
      priority
    />
  </span>
);

export const Navbar = () => {
  const { content: contentClassName, surface: surfaceClassName } = styles;
  const messages = useMessages();
  const chrome = messages.enterpriseChrome;
  const navigation = messages.enterpriseNav;
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const navigationOpen = mobile || active !== null;
  const [tone, setTone] = useState<"light" | "dark">("light");
  const dark = tone === "dark";
  const toneStyle = {
    "--nav-surface": dark
      ? "var(--color-emphasis-dimmed)"
      : "var(--color-background)",
    "--nav-tint": dark
      ? "color-mix(in oklab, var(--color-background-rich) 6%, transparent)"
      : "color-mix(in oklab, var(--color-background-dimmed) 20%, transparent)",
    ...(dark && {
      "--color-foreground": "var(--color-background)",
      "--color-foreground-rich": "var(--color-background-rich)",
      "--color-foreground-dimmed":
        "color-mix(in oklab, var(--color-background-rich) 75%, transparent)",
      "--color-primary-text": "var(--color-primary-rich)",
      "--color-emphasis": "var(--color-background-rich)",
      "--color-emphasis-rich": "var(--color-background-rich)",
      "--color-accent-foreground":
        "color-mix(in oklab, var(--color-background-rich) 15%, transparent)",
      "--color-cross":
        "color-mix(in oklab, var(--color-background-rich) 30%, transparent)",
    }),
  } as CSSProperties;
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
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setActive(null);
    setMobile(false);
  }, [pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-sample after client navigation even when the new route has the same geometry.
  useEffect(() => {
    if (navigationOpen) return;
    const frame = { current: 0 };
    const updateTone = () => {
      frame.current = 0;
      const bounds = header.current?.getBoundingClientRect();
      if (!bounds) return;
      const sampleY = Math.min(innerHeight - 1, bounds.top + bounds.height / 2);
      const surface = document
        .elementsFromPoint(innerWidth / 2, sampleY)
        .filter((element) => !header.current?.contains(element))
        .map((element) =>
          element.closest<HTMLElement>(
            "[data-nav-tone], .marketing-dark, .marketing-closing, .enterprise-blue",
          ),
        )
        .find((element) => element !== null);
      setTone(
        surface?.getAttribute("data-nav-tone") === "dark" ||
          (surface?.getAttribute("data-nav-tone") !== "light" &&
            (surface?.classList.contains("marketing-dark") ||
              surface?.classList.contains("marketing-closing") ||
              surface?.classList.contains("enterprise-blue")))
          ? "dark"
          : "light",
      );
    };
    const schedule = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(updateTone);
    };
    updateTone();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [navigationOpen, pathname]);

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
      data-surface-tone={tone}
      style={toneStyle}
      className={cn(
        fonts,
        "marketing-site marketing-nav marketing-grid-pattern sticky top-0 isolate z-60 shrink-0 bg-transparent font-body font-normal text-foreground transition-colors duration-250 [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] motion-reduce:transition-none [&_.marketing-mega-description]:transition-colors [&_.marketing-mega-label]:transition-colors [&_a]:transition-colors [&_button]:transition-colors",
      )}
      ref={header}
    >
      <NavigationBlur
        dark={dark}
        className="absolute inset-x-0 top-0 -bottom-12 -z-1 min-[1281px]:hidden"
      />
      <div
        className="marketing-nav-inner mx-auto flex h-20 min-w-0 max-w-[1440px] items-center gap-2 px-4 sm:gap-5 sm:px-7 min-[360px]:gap-3"
        ref={navigationRow}
      >
        <Link
          href="/"
          aria-label={navigation.home}
          className="marketing-nav-logo shrink-0 max-[360px]:[&>span]:w-20"
        >
          <NavigationWordmark dark={dark} />
        </Link>
        <NavigationMenu
          className="marketing-desktop-nav ml-auto hidden min-w-0 bg-transparent p-0 min-[1281px]:block"
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
                      className="marketing-nav-trigger marketing-nav-pricing h-11 whitespace-nowrap rounded-xs bg-transparent px-2 xs:px-2 py-3 text-sm hover:bg-transparent hover:text-primary-text focus-visible:text-primary-text"
                    >
                      {navigation.pricing}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem key={group.id} value={group.id}>
                  <NavigationMenuTrigger
                    className="marketing-nav-trigger h-11 whitespace-nowrap rounded-xs bg-transparent px-2 xs:px-2 py-3 text-sm xs:text-sm hover:bg-transparent hover:text-primary-text focus-visible:text-primary-text data-popup-open:bg-transparent data-popup-open:text-primary-text"
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
                      event.preventBaseUIHandler();
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
                    className={cn(
                      "marketing-mega-content max-h-[calc(100dvh-80px)] w-screen xs:w-screen min-w-0 xs:min-w-0 overflow-y-auto overscroll-contain px-0 py-2",
                      contentClassName,
                    )}
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
                      className="marketing-nav-grid relative mx-auto grid max-w-[min(1384px,calc(100%-56px))] grid-cols-[repeat(var(--menu-columns),minmax(0,1fr))] bg-transparent [grid-template-rows:minmax(3rem,auto)_repeat(var(--menu-rows),minmax(6rem,auto))]"
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
                            "marketing-desktop-nav-column relative grid grid-rows-subgrid [grid-row:span_var(--menu-span)]",
                            group.id === "channels"
                              ? "col-span-3 grid-cols-subgrid"
                              : "border-accent-foreground border-l first:border-l-0",
                          )}
                          key={column.title}
                        >
                          <p className="marketing-desktop-nav-heading relative col-span-full flex items-center gap-2.5 border-accent-foreground border-b bg-(--nav-tint) px-5 py-3 font-medium text-foreground-dimmed text-sm leading-snug">
                            <NavigationCategoryIcon
                              group={group.id}
                              column={columnIndex}
                            />
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
                                render={<Link href={item.href} />}
                                onClick={() => setActive(null)}
                                className={cn(
                                  "marketing-desktop-nav-cell group/nav-cell relative flex min-w-0 items-start gap-3 rounded-none border-accent-foreground border-b bg-transparent px-5 xs:px-5 py-4 xs:py-4 text-sm leading-snug hover:bg-background-rich/20 hover:text-primary-text focus-visible:bg-background-rich/20 focus-visible:text-primary-text focus-visible:-outline-offset-4 [&_.marketing-status]:mt-2 [&_.marketing-status]:text-xs",
                                  group.id === "channels" &&
                                    itemIndex % 3 !== 0 &&
                                    "border-l",
                                )}
                              >
                                {(group.id === "channels"
                                  ? itemIndex % 3 !== 0
                                  : columnIndex > 0) && (
                                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                                )}
                                {provider && (
                                  <ProviderLogo
                                    provider={provider}
                                    className={cn(
                                      "marketing-nav-provider mt-0.5 size-6 shrink-0 object-contain",
                                      dark &&
                                        provider === "chatgpt" &&
                                        "invert",
                                      dark &&
                                        ["perplexity", "amazon"].includes(
                                          provider,
                                        ) &&
                                        "brightness-0 invert",
                                    )}
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
                          {[...group.columns]
                            .sort(
                              (first, second) =>
                                second.items.length - first.items.length,
                            )[0]
                            ?.items.slice(column.items.length)
                            .map((item) => (
                              <div
                                aria-hidden="true"
                                key={`${column.title}-${item.href}`}
                                className="relative border-accent-foreground border-b bg-transparent"
                              >
                                {columnIndex > 0 && (
                                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                                )}
                              </div>
                            ))}
                        </div>
                      ))}
                      <NavigationMenuLink
                        render={<Link href={group.featured.href} />}
                        onClick={() => setActive(null)}
                        className="marketing-desktop-nav-feature group/nav-cell relative col-span-full flex items-center justify-between gap-6 rounded-none bg-(--nav-tint) px-5 xs:px-5 py-4 xs:py-4 text-sm leading-snug hover:bg-background-rich/20 hover:text-primary-text focus-visible:bg-background-rich/20 focus-visible:text-primary-text focus-visible:-outline-offset-4"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[repeat(var(--menu-columns),minmax(0,1fr))]"
                        >
                          {(group.id === "channels"
                            ? group.columns.flatMap((column) =>
                                column.items
                                  .slice(0, 3)
                                  .map((item) => item.label),
                              )
                            : group.columns.map((column) => column.title)
                          ).map((column, columnIndex) => (
                            <span key={column} className="relative">
                              {columnIndex > 0 && (
                                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </span>
                          ))}
                        </span>
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
            <NavigationMenuPopup
              className={cn(
                "marketing-mega-popup w-screen xs:w-screen transform-none overflow-visible rounded-none border-0 bg-transparent shadow-none min-[500px]:w-screen",
                surfaceClassName,
              )}
            >
              <NavigationMenuViewport />
            </NavigationMenuPopup>
          </NavigationMenuPositioner>
        </NavigationMenu>
        <div className="marketing-nav-end ml-auto flex shrink-0 items-center gap-4 min-[1281px]:ml-0">
          <div className="marketing-desktop-locale hidden min-[1281px]:block">
            <LanguageSwitcher />
          </div>
          <div className="marketing-nav-login hidden min-[1281px]:block">
            <Button
              variant="soft"
              color={dark ? "accent" : "emphasis"}
              render={<Link href="/sign-in" />}
            >
              {chrome.action.tertiary}
            </Button>
          </div>
          <Button render={<Link href="/demo" />}>
            {chrome.action.primary}
          </Button>
        </div>
        <div className="marketing-mobile-nav block shrink-0 min-[1281px]:hidden">
          <Sheet open={mobile} onOpenChange={setMobile}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  color={dark ? "accent" : "emphasis"}
                  size="icon"
                />
              }
              aria-label={chrome.menu.open}
            >
              <MenuIcon className="size-4" />
            </SheetTrigger>
            <SheetPopup
              data-surface-tone={tone}
              style={toneStyle}
              className={cn(
                fonts,
                surfaceClassName,
                "marketing-site marketing-grid-pattern marketing-mobile-sheet isolate z-70 h-dvh w-screen max-w-none gap-0 overflow-hidden border-0 bg-transparent font-body font-normal text-foreground [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] motion-reduce:animate-none motion-reduce:transition-none sm:max-w-none motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none",
              )}
              classList={{
                backdrop: cn(
                  "z-65 motion-reduce:animate-none motion-reduce:transition-none",
                  dark ? "bg-emphasis-dimmed/40" : "bg-background/40",
                ),
                close: {
                  root: "marketing-sheet-close text-foreground-rich opacity-100",
                },
              }}
            >
              <NavigationBlur
                dark={dark}
                expanded
                className="absolute inset-0 -z-1"
              />
              <SheetHeader className="shrink-0 items-start px-6 pt-7 pb-6 text-left">
                <SheetTitle>
                  <NavigationWordmark dark={dark} />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {chrome.menu.title}
                </SheetDescription>
              </SheetHeader>
              <div className="marketing-mobile-menu-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-7">
                <nav aria-label={chrome.menu.title}>
                  <Accordion
                    multiple
                    data-connected
                    className="marketing-mobile-menu-grid border-0 bg-transparent before:hidden after:hidden"
                  >
                    {navigation.groups.map((group) => (
                      <AccordionItem
                        key={group.id}
                        value={group.id}
                        className="border-accent-foreground last:border-b-0"
                      >
                        <AccordionTrigger className="marketing-mobile-nav-trigger min-h-15 items-center bg-transparent px-4 py-4 font-body text-base before:hidden hover:text-primary-text focus-visible:text-primary-text focus-visible:-outline-offset-4">
                          {group.label}
                        </AccordionTrigger>
                        <AccordionPanel className="data-open:overflow-visible">
                          <div className="marketing-mobile-nav-grid grid border-accent-foreground border-t bg-transparent">
                            {group.columns.map((column, columnIndex) => (
                              <div
                                className="grid border-accent-foreground border-b"
                                key={column.title}
                              >
                                <p className="marketing-nav-column-heading relative flex items-center gap-2.5 bg-transparent px-4 py-3 font-medium text-foreground-dimmed text-sm before:hidden after:hidden">
                                  <NavigationCategoryIcon
                                    group={group.id}
                                    column={columnIndex}
                                  />
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
                                      className="marketing-mobile-nav-cell group/nav-cell relative flex min-h-24 min-w-0 items-start gap-3 border-accent-foreground border-t bg-transparent px-4 py-4 text-sm leading-snug before:hidden hover:bg-(--nav-tint) hover:text-primary-text focus-visible:bg-(--nav-tint) focus-visible:text-primary-text focus-visible:-outline-offset-4 [&_.marketing-status]:mt-2 [&_.marketing-status]:text-xs"
                                    >
                                      {provider && (
                                        <ProviderLogo
                                          provider={provider}
                                          className={cn(
                                            "marketing-nav-provider mt-0.5 size-6 shrink-0 object-contain",
                                            dark &&
                                              ["perplexity", "amazon"].includes(
                                                provider,
                                              ) &&
                                              "brightness-0 invert",
                                          )}
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
                              className="marketing-mobile-nav-cell group/nav-cell relative flex min-h-24 min-w-0 items-start justify-between gap-4 bg-transparent px-4 py-4 text-sm leading-snug before:hidden hover:bg-(--nav-tint) hover:text-primary-text focus-visible:bg-(--nav-tint) focus-visible:text-primary-text focus-visible:-outline-offset-4"
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
                <div className="marketing-mobile-action-grid grid grid-cols-1 border-accent-foreground border-t bg-transparent before:hidden after:hidden sm:grid-cols-2">
                  <SheetClose
                    nativeButton={false}
                    role="link"
                    render={<Link href="/pricing" />}
                    className="marketing-mobile-nav-cell relative col-span-full flex min-h-15 items-center border-accent-foreground border-b bg-transparent px-4 py-4 font-medium text-base text-foreground-rich before:hidden hover:bg-(--nav-tint) hover:text-primary-text focus-visible:text-primary-text"
                  >
                    {navigation.pricing}
                  </SheetClose>
                  <div className="bg-transparent p-4 before:hidden">
                    <Button
                      variant="soft"
                      color={dark ? "accent" : "emphasis"}
                      className="w-full"
                      render={
                        <Link
                          href="/sign-in"
                          onClick={() => setMobile(false)}
                        />
                      }
                    >
                      {chrome.action.tertiary}
                    </Button>
                  </div>
                  <div className="bg-transparent p-4 before:hidden">
                    <Button
                      className="w-full"
                      render={
                        <Link
                          href="/sign-up"
                          onClick={() => setMobile(false)}
                        />
                      }
                    >
                      {chrome.action.secondary}
                    </Button>
                  </div>
                  <div className="col-span-full bg-(--nav-surface) p-4">
                    <LanguageSwitcher variant="mobile" />
                  </div>
                </div>
              </div>
            </SheetPopup>
          </Sheet>
        </div>
      </div>
      <div
        ref={menuSurface}
        className="marketing-menu-surface absolute inset-x-0 top-full hidden min-[1281px]:block"
      >
        <NavigationBlur
          dark={dark}
          expanded={active !== null}
          className="absolute inset-x-0 -top-20 -bottom-12 -z-1"
        />
      </div>
    </header>
  );
};
