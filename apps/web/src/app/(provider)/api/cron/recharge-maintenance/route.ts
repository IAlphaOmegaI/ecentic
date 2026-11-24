import * as Recharge from "@/server/app/integration/recharge/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";
export const maxDuration = 300;
export const GET = async () =>
  respond(await Recharge.maintain(Environment.SERVER));
