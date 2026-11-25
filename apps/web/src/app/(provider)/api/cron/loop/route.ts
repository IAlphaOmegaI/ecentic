import * as Loop from "@/server/app/integration/loop/cron";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";
export const maxDuration = 300;
export const GET = async () => respond(await Loop.drain(Environment.SERVER));
