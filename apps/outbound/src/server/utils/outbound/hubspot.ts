import "server-only";

import { z } from "zod";
import { request } from "./http";

const collection = z.object({
  results: z.array(z.object({ id: z.string() })),
});

/** Verifies read access only; saving a key never writes CRM records. */
export const validateKey = async (apiKey: string) => {
  for (const object of ["contacts", "companies"] as const) {
    const response = await request(
      "hubspot",
      `https://api.hubapi.com/crm/v3/objects/${object}?limit=1`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      collection,
    );
    if (!response.success) return response;
  }
  return { success: true as const, data: { valid: true as const } };
};
