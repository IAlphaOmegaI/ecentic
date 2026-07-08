"use server";

import { AGENT_PROFILE, resolveShoppingService } from "./playground";

/**
 * Unauthenticated on purpose: the playground is a public tool (`/ucp-playground`)
 * and resolving a store only fetches its public `/.well-known/ucp` document, the
 * same surface the UCP validator already exposes. Sending messages is what's
 * metered — see `playground-limit`.
 */
export const resolvePlaygroundStore = async ({ store }: { store: string }) => {
  const service = await resolveShoppingService(store);

  if (!service.success)
    return { success: false as const, error: new Error(service.error) };

  return {
    success: true as const,
    data: {
      transport: service.transport,
      endpoint: service.endpoint,
      profileUrl: service.profileUrl,
      agentProfileUrl: AGENT_PROFILE,
    },
  };
};
