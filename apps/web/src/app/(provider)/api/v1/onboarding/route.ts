import { onboardingIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

export const GET = (request: Request) => served(request, onboardingIndex());

export const OPTIONS = preflight;
