import "server-only";

import { createHash } from "node:crypto";
import type { Message } from "@/lib/outbound";
import {
  canonicalSequenceInput,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Bind a review claim to its text and verdict, including drafts that need repair. */
export const draftCopyReadiness = (messages: readonly Message[]) => {
  const canonical = canonicalSequenceInput(messages);
  const contentHash =
    canonical.status === "ready" ? hash(canonical.canonicalText) : null;
  const readinessHash = hash(
    JSON.stringify({
      content:
        canonical.status === "ready"
          ? canonical.canonicalText
          : messages.map(({ step, afterDays, subject, body }) => ({
              step,
              afterDays,
              subject,
              body,
            })),
      writing: messages.map(({ writing }) => {
        const parsed = writingSnapshotSchema.safeParse(writing);
        return parsed.success ? parsed.data : (writing ?? null);
      }),
    }),
  );
  return { contentHash, readinessHash };
};
