"use server";

import { withAuthentication } from "@/server/utils/authentication";
import { AGENT_PROFILE, resolveShoppingService } from "./playground";

export const resolvePlaygroundStore = withAuthentication(
  async (_, { store }: { store: string }) => {
    const service = await resolveShoppingService(store);

    if (!service.success)
      return { success: false, error: new Error(service.error) };

    return {
      success: true,
      data: {
        transport: service.transport,
        endpoint: service.endpoint,
        profileUrl: service.profileUrl,
        agentProfileUrl: AGENT_PROFILE,
      },
    };
  },
  "Playground.resolveStore",
);
