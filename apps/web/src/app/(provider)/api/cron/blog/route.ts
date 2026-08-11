import * as Cron from "@/server/app/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

// One ingest is a full Azure translation of the article; give it the same room
// the scan drain gets.
export const maxDuration = 300;

export const GET = async () =>
  respond(await Cron.reconcileBlogCatalog(Environment.SERVER, { limit: 1 }));
