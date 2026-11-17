import "server-only";
import { resultify, unwrapResult } from "@zenncore/utils";
import { sql } from "drizzle-orm";
import type {
  LinkedInAccount,
  LinkedInAccountStatus,
} from "@/lib/outbound-unipile";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { NotFoundError, ValidationError } from "@/server/utils/error";
import { repository } from "@/server/utils/repository";

const Accounts = repository(schema.outboundLinkedinAccount);
const Events = repository(schema.outboundEvent);

export const list = () =>
  resultify(async (): Promise<LinkedInAccount[]> => {
    const accounts = await unwrapResult(
      Accounts.find(Environment.SERVER, {
        orderBy: [
          {
            column: schema.outboundLinkedinAccount.createdAt,
            direction: "asc",
          },
        ],
      }),
    );
    return accounts.map(({ id, name, status, isLocked, lastCheckedAt }) => ({
      id,
      name,
      status,
      isLocked,
      lastCheckedAt: lastCheckedAt.toISOString(),
    }));
  });

export const requireAccount = (id: string) =>
  resultify(async () => {
    const account = await unwrapResult(Accounts.get(Environment.SERVER, id));
    if (!account)
      throw new NotFoundError("Connect this LinkedIn account first.");
    return account;
  });

export const save = (
  actor: string,
  account: {
    id: string;
    name?: string;
    user_id: string;
    provider: string;
    status: LinkedInAccountStatus;
    is_locked: boolean;
  },
) =>
  resultify(async () => {
    if (account.provider !== "linkedin")
      throw new ValidationError("Choose a LinkedIn account in Unipile.");
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-linkedin-accounts'))`,
      );
      const existing = await unwrapResult(
        Accounts.get(Environment.SERVER, account.id, { tx: transaction }),
      );
      const input = {
        name: account.name?.trim() || "LinkedIn",
        providerUserId: account.user_id,
        status: account.status,
        isLocked: account.is_locked,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      };
      await unwrapResult(
        existing
          ? Accounts.update(Environment.SERVER, account.id, input, {
              tx: transaction,
            })
          : Accounts.create(
              Environment.SERVER,
              { id: account.id, ...input, connectedBy: actor },
              { tx: transaction },
            ),
      );
      await unwrapResult(
        Events.create(
          Environment.SERVER,
          {
            kind: existing
              ? "linkedin-account-checked"
              : "linkedin-account-connected",
            actor,
            detail: `${input.name}: ${input.status}${input.isLocked ? " (locked)" : ""}`,
          },
          { tx: transaction },
        ),
      );
      return { id: account.id };
    });
  });
