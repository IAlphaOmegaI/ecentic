import { agentInstructions, markdownHeaders } from "@/lib/agent-discovery";

/**
 * `/.well-known/agent-instructions.md` — when to reach for ecentic, when not
 * to, and how to call it.
 *
 * Separate from `llms.txt` (a site map) and `auth.md` (a credential guide):
 * this is routing guidance, and agents that look for an instruction file look
 * for it under a predictable name rather than parsing a site map for intent.
 */
export const GET = () =>
  new Response(agentInstructions, { headers: markdownHeaders });

export const OPTIONS = () => new Response(null, { headers: markdownHeaders });
