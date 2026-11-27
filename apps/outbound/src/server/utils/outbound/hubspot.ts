import "server-only";

import { z } from "zod";
import { type HubspotObject, hubspotPageSchema } from "@/lib/outbound-hubspot";
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

/** One bounded read. The provider's paging link is never followed. */
export const readPage = (input: {
  apiKey: string;
  object: HubspotObject;
  after: string | null;
}) => {
  const parameters = new URLSearchParams({
    limit: "100",
    archived: "false",
    properties:
      input.object === "companies"
        ? "domain,hs_additional_domains"
        : "email,hs_additional_emails",
  });
  if (input.after) parameters.set("after", input.after);
  return request(
    "hubspot",
    `https://api.hubapi.com/crm/v3/objects/${input.object}?${parameters}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${input.apiKey}` },
    },
    hubspotPageSchema,
  );
};
