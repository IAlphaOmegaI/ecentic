"use client";

import { ArrowRightIcon, MenuIcon } from "@zenncore/icons";
import {
  Sheet,
  SheetClose,
  SheetPopup,
  SheetTrigger,
} from "@zenncore/web/components/sheet";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect } from "react";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

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

const NavbarLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== "/") return;
    if (!scrollToHash(href)) return;
    event.preventDefault();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group relative z-100 flex cursor-pointer items-center gap-2 font-header text-2xl text-primary"
    >
      {children}
    </Link>
  );
};

const NavbarDesktop = () => (
  <>
    <div className="relative hidden h-14 items-center justify-center gap-8 lg:flex">
      <div className="absolute left-0 h-14 w-[75%] -translate-x-20 p-4">
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

    <div className="relative hidden h-14 shrink-0 p-4 pr-6 pl-12 sm:h-16 lg:block">
      <Image
        src="/images/right-menu.svg"
        alt=""
        fill
        className="absolute inset-0 object-cover"
        aria-hidden
      />
      <NavbarLink href="/sign-up">
        Install now{" "}
        <ArrowRightIcon className="size-6 transition-transform duration-300 group-hover:translate-x-1" />
      </NavbarLink>
    </div>
  </>
);

const NavbarMobile = () => (
  <div className="relative flex h-14 items-center sm:h-16 lg:hidden">
    <Sheet>
      <SheetTrigger
        className="relative z-100 flex h-16 shrink-0 cursor-pointer items-center justify-center overflow-auto p-4 pr-4 pl-12 text-primary"
        aria-label="Open navigation menu"
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
      <SheetPopup side="right" className="bg-background">
        <nav className="flex flex-col gap-6 p-6 pt-14">
          {links.map((link) => (
            <SheetClose
              key={link.href}
              render={<NavbarLink href={link.href} />}
            >
              {link.label}
            </SheetClose>
          ))}
          <SheetClose render={<NavbarLink href="/sign-up" />}>
            Install now
            <ArrowRightIcon className="size-6" />
          </SheetClose>
        </nav>
      </SheetPopup>
    </Sheet>
  </div>
);

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
