"use server";

import type { SentSearchParams } from "@/lib/outbound-sent";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Sent from "./sent-read";

export const list = withAuthorization(
  [UserRole.STAFF],
  async (_, input: SentSearchParams = {}) => Sent.list(input),
  "Outbound.getSentMessages",
);
export const detail = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string }) => Sent.detail(input),
  "Outbound.getSentMessage",
);
