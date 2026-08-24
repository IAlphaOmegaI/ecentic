import { plansIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

export const GET = (request: Request) => served(request, plansIndex());

export const OPTIONS = preflight;
