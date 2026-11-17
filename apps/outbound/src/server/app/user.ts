import "server-only";
import { schema } from "@/server/database";
import { type Document, repository } from "@/server/utils/repository";

// Internal identity read for authenticated OAuth callbacks. No user mutation
// actions or registration endpoints are exposed by the Outbound application.
export const { get } = repository(schema.user);
export type Type = Document<typeof schema.user>;
