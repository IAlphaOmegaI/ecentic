import { notFoundMarkdown } from "@/lib/not-found";

/**
 * The 404 recovery list as Markdown, at a stable URL.
 *
 * The HTML 404 already embeds this list, but it is 15KB of page around it. An
 * agent that wants only "where do I go next" can fetch this instead and get a
 * few hundred bytes of `text/markdown`. It is advertised from the 404's
 * `<link rel="alternate">`, from `llms.txt`, and from the API catalog.
 *
 * Served with 200, not 404: it is a real document about 404s, and a client that
 * cannot distinguish the two would treat its own recovery instructions as
 * another dead end.
 */
export const GET = () =>
  new Response(notFoundMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
