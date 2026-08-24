import { sandboxIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

export const GET = (request: Request) => served(request, sandboxIndex());

export const OPTIONS = preflight;
