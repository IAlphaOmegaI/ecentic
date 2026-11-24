import { after } from "next/server";
import { withCron } from "@/server/utils/cron";
import * as Jobs from "./jobs";
export const drain = withCron(async () => {
  after(() => Jobs.dispatch());
  return { success: true as const, data: { scheduled: true } };
}, "Loop.drain");
export const maintain = withCron(async () => {
  after(() => Jobs.maintain());
  return { success: true as const, data: { scheduled: true } };
}, "Loop.maintain");
