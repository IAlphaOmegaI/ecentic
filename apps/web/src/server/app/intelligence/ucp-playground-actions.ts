"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AGENT_PROFILE,
  type PlaygroundDataParts,
  resolveShoppingService,
} from "./ucp-playground";

export const resolvePlaygroundStore = async (
  storeUrl: string,
): Promise<
  | { success: true; profile: PlaygroundDataParts["profile"] }
  | { success: false; error: string }
> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return { success: false, error: "Unauthorized" };

  const service = await resolveShoppingService(storeUrl);

  if (!service.success) return { success: false, error: service.error };

  return {
    success: true,
    profile: {
      transport: service.transport,
      endpoint: service.endpoint,
      profileUrl: service.profileUrl,
      agentProfileUrl: AGENT_PROFILE,
    },
  };
};
