import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  type WriterCandidate,
  writerCandidateSchema,
  writerCandidatesSchema,
} from "@/lib/outbound-sequence-composition";
import type { CompositionPeer } from "@/lib/outbound-writing";
import { ValidationError } from "@/server/utils/error";

export const writerDiagnosticHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type WriterCandidateContext = Pick<
  WriterCandidate,
  "receiptHash" | "writingPolicyHash" | "prospectHash"
> & { peers: CompositionPeer[] };
export const writerCandidateContextHash = (context: WriterCandidateContext) =>
  writerDiagnosticHash(
    JSON.stringify({
      receiptHash: context.receiptHash,
      writingPolicyHash: context.writingPolicyHash,
      prospectHash: context.prospectHash,
      peers: context.peers,
    }),
  );
export const appendWriterCandidate = (
  saved: unknown,
  candidate: WriterCandidate,
  context: WriterCandidateContext,
) => {
  const previous = writerCandidatesSchema.parse(saved ?? []);
  const parsed = writerCandidateSchema.parse(candidate);
  for (const item of [...previous, parsed]) {
    if (
      item.partsHash !== writerDiagnosticHash(JSON.stringify(item.parts)) ||
      item.receiptHash !== context.receiptHash ||
      item.writingPolicyHash !== context.writingPolicyHash ||
      item.prospectHash !== context.prospectHash ||
      item.contextHash !== writerCandidateContextHash(context)
    )
      throw new ValidationError(
        "The writer candidate no longer matches its saved text or writing context.",
      );
  }
  const existing = previous.find((item) => item.attempt === parsed.attempt);
  if (existing && isDeepStrictEqual(existing, parsed)) return previous;
  return writerCandidatesSchema.parse([...previous, parsed]);
};
