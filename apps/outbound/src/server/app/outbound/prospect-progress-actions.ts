"use server";

import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Progress from "./prospect-progress";

export const getProgress = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { prospectIds: string[] }) => Progress.getProgress(input),
  "Outbound.getProspectProgress",
);
