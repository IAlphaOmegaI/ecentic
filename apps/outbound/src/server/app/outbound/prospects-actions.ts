"use server";

import type { ProspectSearchParams } from "@/lib/outbound-prospects";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Prospects from "./prospects-read";

export const list = withAuthorization(
  [UserRole.STAFF],
  async (_, input: ProspectSearchParams = {}) => Prospects.list(input),
  "Outbound.getProspects",
);
