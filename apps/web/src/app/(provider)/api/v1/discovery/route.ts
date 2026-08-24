import { discoveryIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

/** Every machine-readable document ecentic publishes, grouped by protocol. */
export const GET = (request: Request) => served(request, discoveryIndex());

export const OPTIONS = preflight;
