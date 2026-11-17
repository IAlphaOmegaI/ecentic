import { resultify } from "@zenncore/utils";
import { z } from "zod";

type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;
type StorageAccess = () => RecoveryStorage;
const browserStorage: StorageAccess = () => window.localStorage;
const storageKey = (campaignId: string) =>
  `ecentic:outbound:claude-request:${z.string().uuid().parse(campaignId)}`;

/** Only the last request UUID is stored locally; the preview remains on the server. */
export const readClaudeRequestId = (
  campaignId: string,
  accessStorage: StorageAccess = browserStorage,
) =>
  resultify(() => {
    const value = accessStorage().getItem(storageKey(campaignId));
    const parsed = z.string().uuid().safeParse(value);
    return parsed.success ? parsed.data : null;
  });

export const writeClaudeRequestId = (
  campaignId: string,
  requestId: string,
  accessStorage: StorageAccess = browserStorage,
) =>
  resultify(() => {
    const validated = z.string().uuid().parse(requestId);
    accessStorage().setItem(storageKey(campaignId), validated);
  });
