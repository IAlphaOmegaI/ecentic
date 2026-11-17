import "server-only";
import * as Jobs from "@/server/app/outbound/jobs";
import * as Credentials from "@/server/app/outbound/provider-credentials";
import { ConflictError } from "@/server/utils/error";
import * as Warmbly from "./warmbly";

/** Check the network itself: a mailbox can be started from Warmbly outside Outbound. */
export const assertWarmupPaused = async (email: string) => {
  const pending = await Jobs.hasPendingWarmup(email);
  if (!pending.success || pending.data)
    throw new ConflictError(
      "Refresh this inbox's Warmbly status to resolve the pending warmup action before delivery.",
    );
  const metadata = await Credentials.metadata("warmbly");
  if (!metadata.success)
    throw new ConflictError("Check the Warmbly connection before delivery.");
  if (!metadata.data.configured) return;
  const inspect = async (cursor?: string, page = 0): Promise<void> => {
    if (page >= 10)
      throw new ConflictError(
        "Warmbly mailbox status could not be fully checked. Delivery remains held.",
      );
    const response = await Warmbly.getMailboxes({ cursor, limit: 100 });
    if (!response.success)
      throw new ConflictError(
        "Warmbly is unavailable. Verify that network warmup is paused before delivery.",
      );
    const mailbox = response.data.mailboxes.find(
      (entry) => entry.email === email.toLowerCase(),
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
};
