import * as Cron from "@/server/app/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const GET = async () =>
  respond(await Cron.runDailyScan(Environment.SERVER, { limit: 20 }));
