import { apiIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

/** Index of the versioned public agent API. */
export const GET = (request: Request) => served(request, apiIndex());

export const OPTIONS = preflight;
