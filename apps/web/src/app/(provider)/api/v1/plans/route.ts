import { isPlanKey, plansIndex } from "@/lib/agent-api";
import { preflight, refused, served } from "@/server/utils/public-api";

export const GET = (request: Request) => {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== null && !isPlanKey(key))
    return refused(
      request,
      "validation-failed",
      `Unknown plan key "${key}". Omit the parameter to list every plan.`,
    );

  return served(request, plansIndex(key ?? undefined));
};

export const OPTIONS = preflight;
