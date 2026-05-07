import { InstagramIcon, LinkedinIcon, XTwitterIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/images/footer.png";
import WordMark from "@/public/images/wordmark.svg";

const pages = [
  { href: "/features", label: "Features" },
  { href: "/features/product-listings", label: "Product Listings" },
  { href: "/platforms/shopify", label: "Shopify" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/compare/best-ai-ecommerce-tools", label: "Compare" },
  { href: "/blog", label: "Blog" },
  { href: "/privacy-policy", label: "Privacy Policy" },
] as const;

export const Footer = () => (
  <section className="relative -left-[calc(50vw-50%)] h-screen w-screen p-1">
    <div className="h-full overflow-hidden rounded-xl border-accent-foreground border-y bg-linear-to-t from-primary to-primary/20">
      <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 p-6 pb-0 md:gap-12 md:p-12 md:pb-0">
        <Image src={WordMark} alt="WordMark" className="w-46" />
        <p className="text-center font-light text-2xl text-foreground md:text-4xl">
          The next era of commerce isn't about who ranks #1 on Google.
          <br />
          <span className="font-medium text-primary">
            It's about who gets picked by the agent.
          </span>
        </p>
        <Button
          variant="flat"
          color="primary"
          type="button"
          className="px-12 py-4 font-medium text-xl"
          render={<Link href="/sign-up" />}
        >
          Get your free Win Rate Report
        </Button>
        <div className="flex items-center gap-4">
          {(
            [
              {
                href: "https://x.com/ecentic_ai",
                svg: <XTwitterIcon className="size-6" fill="currentColor" />,
              },
              {
                href: "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
                svg: <LinkedinIcon className="size-6" fill="currentColor" />,
              },
              {
                href: "https://www.instagram.com/ecentic.ai/",
                svg: <InstagramIcon className="size-6" fill="currentColor" />,
              },
            ] as const
          ).map(({ href, svg }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-11 items-center justify-center rounded-full border border-primary/30 text-primary transition-colors hover:border-primary"
            >
              {svg}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-base text-white">
          {pages.map((page, index) => (
            <div key={page.href} className="flex items-center gap-3">
              {index > 0 && <span className="text-white/40">/</span>}
              <Link
                href={page.href}
                className="transition-colors hover:text-white/80"
              >
                {page.label}
              </Link>
            </div>
          ))}
        </div>

        <div className="relative w-full flex-1 origin-bottom transition-transform duration-500 ease-out hover:scale-[1.02]">
          <Image
            src={Logo}
            alt="Logo"
            fill
            sizes="(min-width: 2160px) 1056px, (min-width: 1000px) calc(90.88vw - 889px), (min-width: 780px) calc(100vw - 104px), (min-width: 700px) calc(96.67vw - 672px), (min-width: 560px) calc(100vw - 56px), (min-width: 440px) calc(205vw - 623px), calc(226.67vw - 774px)"
            className="object-contain object-bottom"
          />
        </div>
      </div>
    </div>
  </section>
);
