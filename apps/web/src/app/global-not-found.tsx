import type { Metadata } from "next";
import { notFoundMarkdown, RECOVERY_LINKS } from "@/lib/not-found";
import "./globals.css";

export const metadata: Metadata = {
  title: "Not found | ecentic",
  description:
    "This page could not be found. Recovery links to the ecentic sitemap, llms.txt, developer docs, and API catalog.",
  // Points a Markdown-reading agent at the few-hundred-byte version of this
  // page instead of the 15KB of HTML around the same six links.
  alternates: { types: { "text/markdown": "/404.md" } },
};

/**
 * App-wide 404 when there is no root `app/layout.tsx` (locale is the root).
 *
 * `global-not-found` bypasses the layout tree, so everything this page needs is
 * imported here and the copy stays in English rather than reaching for
 * next-intl.
 *
 * The recovery list is the point. A bare "page not found" tells a crawler the
 * status and nothing else, so an agent that mistypes one path has to abandon
 * the site; naming the sitemap, llms.txt, the docs index and the API catalog
 * lets it correct itself on the next request. The same list is repeated as a
 * literal Markdown block because agents read the raw HTML, and a `<pre>` of
 * Markdown survives every stripper that would otherwise leave them with
 * unanchored link text — and is served on its own at `/404.md` for a client
 * that would rather not parse 15KB of page to find six links.
 */

const markdown = notFoundMarkdown();

export default () => {
  return (
    <html lang="en">
      <body className="overflow-x-hidden bg-background font-body text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
          <div className="flex flex-col gap-4">
            <p className="text-foreground/60 text-sm">404</p>
            <h1 className="font-display text-3xl tracking-tight">
              Page not found
            </h1>
            <p className="text-foreground/60">
              The page you requested does not exist or has been moved. These are
              the entry points worth trying next — the last four are
              machine-readable.
            </p>
          </div>

          <nav aria-label="Recovery links">
            <ul className="flex flex-col gap-3">
              {RECOVERY_LINKS.map((link) => (
                <li key={link.href} className="flex flex-col">
                  <a
                    href={link.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                  <span className="text-foreground/60 text-sm">
                    {link.description}
                  </span>
                </li>
              ))}
            </ul>
          </nav>

          <details className="text-foreground/60 text-sm">
            <summary className="cursor-pointer">
              Same list as Markdown, for agents
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
              {markdown}
            </pre>
          </details>
        </main>
      </body>
    </html>
  );
};
