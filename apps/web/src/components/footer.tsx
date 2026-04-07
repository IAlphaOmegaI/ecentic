import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/images/footer.png";
import WordMark from "@/public/images/wordmark.svg";

const pages = [
  { href: "/features", label: "Features" },
  { href: "/features/product-listings", label: "Product Listings" },
  { href: "/platforms/shopify", label: "Shopify" },
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
          The next era of commerce isn't about who ranks #1 on Google. <br />
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
                svg: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[22px]"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                href: "https://www.linkedin.com/company/ecentic/posts/?feedView=all",
                svg: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[22px]"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                ),
              },
              {
                href: "https://www.instagram.com/ecentic.ai/",
                svg: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[22px]"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                ),
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
