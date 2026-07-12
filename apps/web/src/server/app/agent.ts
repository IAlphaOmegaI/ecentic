"use server";

import crypto from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { ValidationError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as User from "./user";

export const { get, create, update, destroy, exists, count, find } = repository(
  schema.agentApiKey,
);

export type Type = Document<typeof schema.agentApiKey>;

const hash = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const createRawApiKey = () => {
  const secret = crypto.randomBytes(32).toString("base64url");
  const raw = `ecentic_sk_${secret}`;
  const prefix = raw.slice(0, 18);
  return { raw, prefix };
};

export const createForCurrentUser = withAuthentication(
  async (context, { name }: { name: string }) => {
    return createForUser(Environment.SERVER, {
      user: context.session.user.id,
      name,
    });
  },
  "Agent.createForCurrentUser",
);

export const createForUser = withContext(
  async (
    _,
    {
      user,
      name,
    }: {
      user: string;
      name: string;
    },
  ) => {
    const label = name.trim();
    if (!label)
      return {
        success: false as const,
        error: new ValidationError("API key name is required"),
      };

    const key = createRawApiKey();

    const creation = await create(Environment.SERVER, {
      userId: user,
      name: label,
      prefix: key.prefix,
      keyHash: hash(key.raw),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!creation.success) return creation;

    return {
      success: true as const,
      data: {
        id: creation.data.id,
        name: creation.data.name,
        key: key.raw,
        prefix: creation.data.prefix,
      },
    };
  },
  "Agent.createForUser",
);

export const authenticate = withContext(
  async (
    _,
    {
      token,
    }: {
      token: string;
    },
  ) => {
    const keyHash = hash(token);

    const rows = await find(Environment.SERVER, {
      where: and(
        eq(schema.agentApiKey.keyHash, keyHash),
        isNull(schema.agentApiKey.revokedAt),
        or(
          isNull(schema.agentApiKey.expiresAt),
          gt(schema.agentApiKey.expiresAt, new Date()),
        ),
      ),
      limit: 1,
    });

    if (!rows.success) return rows;

    const key = rows.data[0] ?? null;
    if (!key) return { success: true as const, data: null };

    if (key.expiresAt && key.expiresAt.getTime() < Date.now())
      return { success: true as const, data: null };

    const user = await User.get(Environment.SERVER, key.userId);
    if (!user.success) return user;
    if (!user.data) return { success: true as const, data: null };

    void update(Environment.SERVER, key.id, {
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true as const,
      data: {
        user: user.data,
        key,
      },
    };
  },
  "Agent.authenticate",
);
