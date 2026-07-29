import {
  apiCatalogContentType,
  apiCatalogDocument,
} from "@/lib/agent-discovery";

const headers = {
  "Content-Type": apiCatalogContentType,
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
  Link: '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
} as const;

export const GET = () =>
  new Response(JSON.stringify(apiCatalogDocument, null, 2), { headers });

export const HEAD = () => new Response(null, { headers });
