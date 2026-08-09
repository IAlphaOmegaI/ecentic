"use client";

import { ArrowRightIcon, MenuIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { buttonVariants } from "@zenncore/web/components/button";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@zenncore/web/components/sheet";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type MouseEvent, type ReactNode, useEffect } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Motion } from "@/components/motion";
import { Link, usePathname } from "@/i18n/navigation";

const scrollToHash = (href: string) => {
  const index = href.indexOf("#");
  if (index === -1) return false;
  const hash = href.slice(index + 1);
  if (!hash) return false;
  const target = document.getElementById(hash);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth" });
  window.history.pushState(null, "", `/#${hash}`);
  return true;
};

const isLinkActive = (href: string, pathname: string) => {
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
};

const useNavLinks = () => {
  const translate = useTranslations("nav");

  return [
    { href: "/#how", label: translate("links.howItWorks") },
    { href: "/resources", label: translate("links.resources") },
    { href: "/pricing", label: translate("links.pricing") },
    { href: "/blog", label: translate("links.blog") },
  ] as const;
};

const NavbarLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
}) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      window.location.pathname !== "/" &&
      !window.location.pathname.endsWith("/es")
    )
      return;
    if (!scrollToHash(href)) return;
    event.preventDefault();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "group relative z-100 flex cursor-pointer items-center gap-2 font-body text-2xl text-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
};

const NavbarDesktop = () => {
  const translate = useTranslations("nav");
  const links = useNavLinks();

  return (
    <>
      <div className="relative hidden h-14 items-center justify-center gap-8 lg:flex">
        <div className="absolute left-0 h-14 w-full -translate-x-24 p-4">
          <Image
            src="/images/right-menu.svg"
            alt=""
            fill
            className="absolute inset-0 object-cover"
            aria-hidden
          />
        </div>
        {links.map((link) => (
          <NavbarLink key={link.href} href={link.href}>
            {link.label}
          </NavbarLink>
        ))}
        <div className="absolute right-0 h-14 w-[75%] translate-x-20 p-4">
          <Image
            src="/images/left-menu.svg"
            alt=""
            fill
            className="absolute inset-0 object-cover"
            aria-hidden
          />
        </div>
      </div>

      <div className="relative hidden h-14 shrink-0 items-center gap-8 p-4 pr-6 pl-12 sm:h-16 lg:flex">
        <Image
          src="/images/right-menu.svg"
          alt=""
          fill
          className="absolute inset-0 object-cover"
          aria-hidden
        />
        <LanguageSwitcher variant="nav" className="relative z-100 -mr-6 ml-2" />
        <div className="relative z-100 h-full w-px bg-accent-foreground" />
        <NavbarLink href="/sign-up">
          {translate("action.primary")}{" "}
          <ArrowRightIcon className="size-6 transition-transform duration-300 group-hover:translate-x-1" />
        </NavbarLink>
      </div>
    </>
  );
};

const NavbarMobile = () => {
  const translate = useTranslations("nav");
  const translateSignIn = useTranslations("signIn");
  const pathname = usePathname();
  const links = useNavLinks();

  return (
    <div className="relative flex h-14 items-center gap-2 sm:h-16 lg:hidden">
      <LanguageSwitcher variant="nav" className="relative z-100 mr-1" />
      <Sheet>
        <SheetTrigger
          className="relative z-100 flex h-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden p-4 pr-4 pl-12 text-primary transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] sm:h-16"
          aria-label={translate("menu.action.primary")}
        >
          <Image
            src="/images/right-menu.svg"
            alt=""
            fill
            className="absolute inset-0 object-cover object-left"
            aria-hidden
          />
          <MenuIcon className="relative z-100 size-6" />
        </SheetTrigger>
        <SheetPopup
          side="right"
          className="w-full gap-0 border-accent-foreground bg-background sm:max-w-md"
          classList={{
            close: {
              root: "top-5 right-5 flex size-10 items-center justify-center text-foreground opacity-100",
              icon: "size-5",
            },
          }}
        >
          <SheetHeader className="items-start border-accent-foreground border-b px-6 pt-6 pr-16 pb-5 text-left">
            <SheetTitle className="sr-only">
              {translate("menu.label")}
            </SheetTitle>
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              width={120}
              height={32}
              className="h-7 w-auto self-start"
            />
            <SheetDescription className="mt-3 max-w-[16rem] text-left font-light text-base text-foreground-dimmed leading-snug">
              {translate("tagline")}
            </SheetDescription>
          </SheetHeader>

          <Motion.Stagger
            stagger={0.05}
            className="flex min-h-0 flex-1 flex-col"
          >
            <nav className="flex flex-col">
              {links.map((link, index) => {
                const active = isLinkActive(link.href, pathname);

                return (
                  <Motion.Item key={link.href}>
                    <SheetClose
                      render={
                        <NavbarLink
                          href={link.href}
                          className={cn(
                            "relative min-h-14 w-full gap-4 border-accent-foreground border-b px-6 py-4 font-medium text-xl transition-colors duration-150",
                            active
                              ? "bg-primary/5 text-primary"
                              : "text-foreground hover:bg-primary/5",
                          )}
                        />
                      }
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[3px] bg-primary"
                        />
                      )}
                      <span className="w-8 shrink-0 font-mono text-primary text-sm tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-left">{link.label}</span>
                      <ArrowRightIcon
                        className={cn(
                          "size-5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5",
                          active ? "text-primary" : "text-foreground-dimmed",
                        )}
                      />
                    </SheetClose>
                  </Motion.Item>
                );
              })}
            </nav>

            <Motion.Item className="mt-auto">
              <SheetFooter className="mt-0 items-stretch border-accent-foreground border-t p-6">
                <p className="mb-4 font-light text-foreground-dimmed text-sm leading-snug">
                  {translate("installHint")}
                </p>
                <SheetClose
                  render={
                    <Link
                      href="/sign-up"
                      className={cn(
                        buttonVariants({
                          variant: "default",
                          color: "primary",
                        }),
                        "w-full justify-center px-5 py-3 text-base transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                      )}
                    />
                  }
                >
                  {translate("action.primary")}
                  <ArrowRightIcon className="size-5" />
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/sign-in"
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          color: "neutral",
                        }),
                        "mt-2 w-full justify-center px-5 py-3 text-base",
                      )}
                    />
                  }
                >
                  {translateSignIn("action.primary")}
                </SheetClose>
              </SheetFooter>
            </Motion.Item>
          </Motion.Stagger>
        </SheetPopup>
      </Sheet>
    </div>
  );
};

export const Navbar = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 top-0 right-0 left-0 z-50 flex items-center justify-between">
      <div className="absolute inset-x-0 top-0 h-[6px] w-full bg-[#EEE]" />
      <div className="relative h-14 shrink-0 p-4 pr-12 sm:h-16">
        <Image
          src="/images/left-menu.svg"
          alt="ecentic"
          fill
          className="absolute inset-0 object-cover"
        />
        <Link href="/" aria-label="Go to the ecentic homepage">
          <Image
            src="/images/trademark.svg"
            alt="ecentic"
            width={100}
            height={100}
            className="relative z-100 -mt-1.5 h-auto w-32 md:w-40"
            loading="eager"
          />
        </Link>
      </div>

      <NavbarDesktop />
      <NavbarMobile />
    </nav>
  );
};
