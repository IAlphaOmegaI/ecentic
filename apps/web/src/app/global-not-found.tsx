import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Not found | ecentic",
  description: "This page could not be found.",
};

/** App-wide 404 when there is no root `app/layout.tsx` (locale is the root). */
export default () => {
  return (
    <html lang="en">
      <body className="overflow-x-hidden bg-background font-body text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
          <p className="text-foreground/60 text-sm">404</p>
          <h1 className="font-display text-3xl tracking-tight">
            Page not found
          </h1>
          <p className="text-foreground/60">
            The page you requested does not exist or has been moved.
          </p>
          <a
            href="/"
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to home
          </a>
        </main>
      </body>
    </html>
  );
};
