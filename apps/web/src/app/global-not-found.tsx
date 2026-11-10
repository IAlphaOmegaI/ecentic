import { headers } from "next/headers";
import {
  NotFoundContent,
  recoveryMetadata,
} from "./_components/not-found-content";
import "./globals.css";
import "../components/marketing/marketing.css";

// A global 404 bypasses the locale layout. Its request locale determines the
// document's <html lang> before any bytes are sent. Blocking only this boundary
// keeps the response a real 404; streaming through the locale layout can flush
// HTTP 200 before notFound() is handled. Normal pages retain instant rendering.
export const instant = false;

const recoveryLocale = async () =>
  (await headers()).get("x-next-intl-locale") === "es" ? "es" : "en";

export const generateMetadata = async () =>
  recoveryMetadata(await recoveryLocale());

export default async () => {
  const locale = await recoveryLocale();
  return (
    <html lang={locale}>
      <body className="marketing-site">
        <NotFoundContent locale={locale} />
      </body>
    </html>
  );
};
