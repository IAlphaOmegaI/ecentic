import * as BlogBackfill from "@/server/app/blog-backfill";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const POST = async () =>
  respond(await BlogBackfill.translateMissingSpanish(Environment.SERVER));
