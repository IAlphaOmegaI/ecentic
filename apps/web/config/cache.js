// @ts-check
const { Redis } = require("@upstash/redis");
const cache = Redis.fromEnv();

/**
 * @import {CacheHandler as CacheHandlerPrimitive, CacheEntry} from "next/dist/server/lib/cache-handlers/types"
 */

const ENTRY_PREFIX = "next:cache:entry:";
const TAG_PREFIX = "next:cache:tag:";

/**
 * @param {string} cacheKey
 * @returns {string}
 */
const toEntryKey = (cacheKey) =>
  `${ENTRY_PREFIX}${Buffer.from(cacheKey).toString("base64url")}`;

/**
 * @param {string} tag
 * @returns {string}
 */
const toTagKey = (tag) => `${TAG_PREFIX}${tag}`;

/**
 * @implements {CacheHandlerPrimitive}
 */
export class CacheHandler {
  /**
   * @param {string} key
   * @param {string[]} tags
   * @returns {Promise<CacheEntry | undefined>}
   */
  async get(key, tags = []) {
    const serialized = await cache.get(toEntryKey(key));

    if (!serialized) {
      return undefined;
    }

    /** @type {any} */
    const payload =
      typeof serialized === "string" ? JSON.parse(serialized) : serialized;

    const entry = this.deserializeEntry(payload);
    const now = Date.now();

    const hasExpiredByTtl =
      typeof entry.expire === "number" &&
      Number.isFinite(entry.expire) &&
      entry.expire > 0 &&
      entry.timestamp + entry.expire * 1000 <= now;

    if (hasExpiredByTtl) {
      return undefined;
    }

    const hasExpiredByRevalidate =
      typeof entry.revalidate === "number" &&
      Number.isFinite(entry.revalidate) &&
      entry.revalidate > 0 &&
      entry.timestamp + entry.revalidate * 1000 <= now;

    if (hasExpiredByRevalidate) {
      return undefined;
    }

    const latestTagExpiration = await this.getExpiration(tags);

    if (latestTagExpiration > entry.timestamp) {
      return undefined;
    }

    return entry;
  }

  /**
   * @param {string} key
   * @param {Promise<CacheEntry>} pendingEntry
   * @returns {Promise<void>}
   */
  async set(key, pendingEntry) {
    const entry = await pendingEntry;
    const payload = await this.serializeEntry(entry);
    const ttlSeconds = this.getEntryTtl(entry);

    if (ttlSeconds > 0) {
      await cache.set(toEntryKey(key), payload, { ex: ttlSeconds });
      return;
    }

    await cache.set(toEntryKey(key), payload);
  }

  /**
   * @returns {Promise<void>}
   */
  async refreshTags() {}

  /**
   * @param {string[]} tags
   * @returns {Promise<number>}
   */
  async getExpiration(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return 0;
    }

    const expirationValues = await Promise.all(
      tags.map(async (tag) => Number((await cache.get(toTagKey(tag))) ?? 0)),
    );

    return expirationValues.reduce(
      (latest, value) =>
        Number.isFinite(value) && value > latest ? value : latest,
      0,
    );
  }

  /**
   * @param {string[] | string} tags
   * @returns {Promise<void>}
   */
  async updateTags(tags) {
    await this.expireTags(tags);
  }

  /**
   * @param {string[] | string} tags
   * @returns {Promise<void>}
   */
  async expireTags(tags) {
    const normalizedTags = this.normalizeTags(tags);

    if (normalizedTags.length === 0) {
      return;
    }

    const timestamp = Date.now();
    await Promise.all(
      normalizedTags.map(async (tag) => cache.set(toTagKey(tag), timestamp)),
    );
  }

  /**
   * Compatibility for the `cacheHandler` (singular) API.
   * @param {string[] | string} tags
   * @returns {Promise<void>}
   */
  async revalidateTag(tags) {
    await this.expireTags(tags);
  }

  /**
   * Compatibility for the `cacheHandler` (singular) API.
   * @returns {Promise<void>}
   */
  async resetRequestCache() {}

  /**
   * @param {CacheEntry} entry
   * @returns {Promise<any>}
   */
  async serializeEntry(entry) {
    const chunks = [];
    const reader = entry.value.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(Buffer.from(value));
    }

    return {
      ...entry,
      value: Buffer.concat(chunks).toString("base64"),
    };
  }

  /**
   * @param {any} payload
   * @returns {CacheEntry}
   */
  deserializeEntry(payload) {
    const bytes = Uint8Array.from(Buffer.from(payload.value, "base64"));

    return {
      ...payload,
      value: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    };
  }

  /**
   * @param {CacheEntry} entry
   * @returns {number}
   */
  getEntryTtl(entry) {
    const limits = [entry.expire, entry.revalidate]
      .filter(
        (value) =>
          typeof value === "number" && Number.isFinite(value) && value > 0,
      )
      .map((value) => Math.ceil(value));

    if (limits.length === 0) {
      return 0;
    }

    return Math.max(...limits);
  }

  /**
   * @param {string[] | string | undefined} tags
   * @returns {string[]}
   */
  normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.filter(Boolean);
    }

    if (typeof tags === "string" && tags.length > 0) {
      return [tags];
    }

    return [];
  }
}
