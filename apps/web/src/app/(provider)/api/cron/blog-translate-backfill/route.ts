import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const POST = async () =>
  respond(await Blog.translateMissingSpanish(Environment.SERVER));
