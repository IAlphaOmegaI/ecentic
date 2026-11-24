import { after } from "next/server";
import { withCron } from "@/server/utils/cron";
import * as Jobs from "./jobs";

export const drain = withCron(async () => {
  after(() => Jobs.drain({ limit: 20 }));
  return { success: true as const, data: { scheduled: true } };
}, "Recharge.drain");

export const maintain = withCron(async () => {
  after(async () => {
    await Jobs.maintain();
    await Jobs.drain({ limit: 20 });
  });
  return { success: true as const, data: { scheduled: true } };
}, "Recharge.maintain");
