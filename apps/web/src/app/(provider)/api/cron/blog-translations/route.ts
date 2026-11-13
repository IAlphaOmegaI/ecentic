import * as Cron from "@/server/app/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const maxDuration = 300;

export const GET = async () =>
  respond(await Cron.drainBlogTranslations(Environment.SERVER));
