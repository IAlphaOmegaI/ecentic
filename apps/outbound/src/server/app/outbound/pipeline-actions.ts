"use server";

import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Pipeline from "./pipeline-read";

export const getOverview = withAuthorization(
  [UserRole.STAFF],
  async () => Pipeline.read(),
  "Outbound.getPipelineOverview",
);
