import { authMd, markdownHeaders } from "@/lib/agent-discovery";

export const GET = () =>
  new Response(authMd, {
    headers: markdownHeaders,
  });

export const OPTIONS = () =>
  new Response(null, {
    headers: markdownHeaders,
  });
