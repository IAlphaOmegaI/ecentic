import * as Checks from "@/server/app/recharge-offer-check";
import { withCron } from "@/server/utils/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const maxDuration = 300;

const drain = withCron(async () => Checks.drain(), "RechargeChecks.drain");

export const GET = async () => respond(await drain(Environment.SERVER));
