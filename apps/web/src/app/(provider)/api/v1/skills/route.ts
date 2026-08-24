import { skillsIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

export const GET = (request: Request) => served(request, skillsIndex());

export const OPTIONS = preflight;
