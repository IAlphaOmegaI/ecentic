import * as Cron from "@/server/app/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

// A single scan can take a couple of minutes; give the drain room to finish.
export const maxDuration = 300;

export const GET = async () =>
  respond(await Cron.drainPendingScans(Environment.SERVER, { limit: 1 }));
