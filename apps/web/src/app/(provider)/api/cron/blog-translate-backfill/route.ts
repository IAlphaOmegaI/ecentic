import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

// Azure translate per article is slow — batch via `?limit=` from the script.
export const maxDuration = 300;

export const POST = async (request: Request) => {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  return respond(
    await Blog.translateMissingSpanish(Environment.SERVER, {
      limit:
        typeof limit === "number" && Number.isFinite(limit) && limit > 0
          ? limit
          : undefined,
    }),
  );
};
