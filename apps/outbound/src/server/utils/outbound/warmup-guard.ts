import "server-only";
import * as Jobs from "@/server/app/outbound/jobs";
import * as Credentials from "@/server/app/outbound/provider-credentials";
import type { TransactionScope } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import * as Warmbly from "./warmbly";

export type WarmupPreflight = {
  email: string;
  version: string;
  checkedAt: number;
  networkChecked: boolean;
};
const maximumAge = 30_000;

const localState = async (email: string, transaction?: TransactionScope) => {
  const pending = await Jobs.hasPendingWarmup(email, transaction);
  if (!pending.success || pending.data)
    throw new ConflictError(
      "Refresh this inbox's Warmbly status to resolve the pending warmup action before delivery.",
    );
  const metadata = await Credentials.metadata("warmbly", transaction, true);
  if (!metadata.success || !metadata.data.version)
    throw new ConflictError("Check the Warmbly connection before delivery.");
  return {
    configured: metadata.data.configured,
    version: metadata.data.version,
  };
};

/** Remote pagination runs before taking the workspace lock. */
export const preflightWarmup = async (
  email: string,
): Promise<WarmupPreflight> => {
  const normalized = email.trim().toLowerCase();
  const startedAt = Date.now();
  const metadata = await localState(normalized);
  const proof = {
    email: normalized,
    version: metadata.version,
    checkedAt: startedAt,
    networkChecked: metadata.configured,
  };
  if (!metadata.configured) return proof;
  const inspect = async (cursor?: string, page = 0): Promise<void> => {
    if (page >= 10 || Date.now() - startedAt > maximumAge)
      throw new ConflictError(
        "Warmbly mailbox status could not be fully checked. Delivery remains held.",
      );
    const response = await Warmbly.getMailboxes({ cursor, limit: 100 });
    if (!response.success)
      throw new ConflictError(
        "Warmbly is unavailable. Verify that network warmup is paused before delivery.",
      );
    const mailbox = response.data.mailboxes.find(
      (entry) => entry.email === normalized,
    );
    if (mailbox) {
      if (!["off", "paused"].includes(mailbox.state))
        throw new ConflictError(
          "Pause this inbox's Warmbly warmup before sending campaign messages.",
        );
      return;
    }
    if (!response.data.hasMore) return;
    if (!response.data.nextCursor || response.data.nextCursor === cursor)
      throw new ConflictError(
        "Warmbly mailbox status could not be fully checked. Delivery remains held.",
      );
    return inspect(response.data.nextCursor, page + 1);
  };
  await inspect();
  return proof;
};

/** Recheck local actions and credentials using the lock holder's connection. */
export const assertWarmupPreflight = async (
  email: string,
  proof: WarmupPreflight,
  transaction: TransactionScope,
) => {
  if (
    proof.email !== email.trim().toLowerCase() ||
    Date.now() < proof.checkedAt ||
    (proof.networkChecked && Date.now() - proof.checkedAt > maximumAge)
  )
    throw new ConflictError(
      "Refresh the Warmbly delivery check before continuing.",
    );
  const current = await localState(proof.email, transaction);
  if (
    current.version !== proof.version ||
    (!proof.networkChecked && current.configured)
  )
    throw new ConflictError(
      "The Warmbly connection changed. Check warmup again before delivery.",
    );
};

/** Standalone checks still inspect the live network, including mailbox tests. */
export const assertWarmupPaused = async (email: string) => {
  await preflightWarmup(email);
};
