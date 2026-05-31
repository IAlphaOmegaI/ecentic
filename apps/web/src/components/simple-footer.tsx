import { InstagramIcon, LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import WordMark from "@/public/images/wordmark.svg";

const links = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/platforms/shopify", label: "Shopify" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/demo", label: "Book a demo" },
  { href: "/blog", label: "Blog" },
  { href: "/privacy-policy", label: "Privacy Policy" },
] as const;

const socials = [
  {
    href: "https://x.com/ecentic_ai",
    icon: <XTwitterIcon className="size-4" fill="currentColor" />,
    label: "X",
  },
  {
    href: "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
    icon: <LinkedinIcon className="size-4" fill="currentColor" />,
    label: "LinkedIn",
  },
  {
    href: "https://www.instagram.com/ecentic.ai/",
    icon: <InstagramIcon className="size-4" fill="currentColor" />,
    label: "Instagram",
  },
] as const;

export const SimpleFooter = () => (
  <footer className="border-accent-foreground border-t">
    <div className="mx-auto max-w-6xl border-accent-foreground border-x px-8 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/">
          <Image src={WordMark} alt="écentic" className="h-4 w-auto" />
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-foreground-dimmed text-sm transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {socials.map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-foreground-dimmed transition-colors hover:text-primary"
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
      <div className="mt-6 border-accent-foreground border-t pt-4">
        <p className="text-foreground-dimmed text-xs">
          © 2026 écentic. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);
