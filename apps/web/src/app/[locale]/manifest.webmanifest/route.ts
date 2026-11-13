import { isLocale } from "@/i18n/locales";
import { createWebManifest } from "@/lib/web-manifest";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) => {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;
  return Response.json(
    createWebManifest(
      locale,
      messages.general.meta,
      messages.general.media.interfaceEnglish,
    ),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
};
