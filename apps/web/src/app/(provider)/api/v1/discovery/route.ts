import { discoveryIndex, isProtocolKey } from "@/lib/agent-api";
import { preflight, refused, served } from "@/server/utils/public-api";

export const GET = (request: Request) => {
  const protocol = new URL(request.url).searchParams.get("protocol");
  if (protocol !== null && !isProtocolKey(protocol))
    return refused(
      request,
      "validation-failed",
      `Unknown protocol "${protocol}". Omit the parameter to list every protocol.`,
    );

  return served(request, discoveryIndex(protocol ?? undefined));
};

export const OPTIONS = preflight;
