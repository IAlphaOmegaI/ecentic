/**
 * Revisions of the UCP specification the profile validator implements, oldest
 * first. Each one has its own rule set in
 * `server/app/intelligence/ucp/validator.ts`; a profile that declares any other
 * revision is reported as not validated rather than judged by these.
 *
 * Published revisions: https://ucp.dev/versions.json
 */
export const UCP_REVISIONS = ["2026-04-08", "2026-08-25"] as const;

export type UcpRevision = (typeof UCP_REVISIONS)[number];

/**
 * The newest published revision — the one `versions.json` aliases `latest`.
 *
 * This is what the validator reads other people's profiles against. It is not
 * the revision ecentic's own UCP endpoints speak: that is `UCP_VERSION` in
 * `server/app/ucp/protocol.ts` (mirrored by `ucpVersion` in
 * `lib/agent-discovery.ts`), which moves only when the hosted service itself is
 * ported. `UCP_REVISIONS` must always include it, so the profiles we serve are
 * never ones our own validator refuses to read.
 */
export const LATEST_UCP_VERSION = "2026-08-25" satisfies UcpRevision;

export const isUcpRevision = (version: string): version is UcpRevision =>
  UCP_REVISIONS.some((revision) => revision === version);
