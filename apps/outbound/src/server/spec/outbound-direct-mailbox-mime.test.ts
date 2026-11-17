import { describe, expect, mock, test } from "bun:test";
import { Readable } from "node:stream";
import type { DownloadMeta, ImapFlow, MessageStructureObject } from "imapflow";
import { simpleParser } from "mailparser";

mock.module("server-only", () => ({}));
const { loadDirectMessage } = await import(
  "@/server/utils/outbound/direct-mailbox-mime"
);
const headers = Buffer.from(
  [
    "From: Sender <sender@joinecentic.com>",
    "To: recipient@example.com",
    "Bcc: earlier-contact@example.org",
    "Message-ID: <original@joinecentic.com>",
    "References: <conversation@example.com>",
    "Subject: A real historical message",
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="original"',
    "",
    "",
  ].join("\r\n"),
);

const fixture = (
  parts: Record<string, { text: Buffer; meta?: DownloadMeta }>,
) => {
  const requests: Array<{
    uid: number | string | bigint;
    part?: string;
    maxBytes?: number;
    decodeText?: boolean;
  }> = [];
  const client: Pick<ImapFlow, "download"> = {
    download: async (uid, part, options) => {
      requests.push({
        uid,
        part,
        maxBytes: options?.maxBytes,
        decodeText: options?.decodeText,
      });
      const selected = part ? parts[part] : undefined;
      if (!selected) return {};
      return {
        meta: selected.meta ?? { contentType: "text/plain", charset: "utf-8" },
        content: Readable.from([selected.text.subarray(0, options?.maxBytes)]),
      };
    },
  };
  return { client, requests };
};
const largeMessage = (bodyStructure: MessageStructureObject) => ({
  uid: 37,
  size: 8_000_000,
  headers,
  bodyStructure,
});

describe("bounded historical mailbox MIME", () => {
  test("imports text and historical Bcc without downloading a large attachment", async () => {
    const { client, requests } = fixture({
      "1": { text: Buffer.from("Please remove me from future emails.") },
    });
    const source = await loadDirectMessage(
      client,
      largeMessage({
        type: "multipart/mixed",
        childNodes: [
          { part: "1", type: "text/plain", size: 42 },
          {
            part: "2",
            type: "application/pdf",
            disposition: "attachment",
            size: 7_999_958,
          },
        ],
      }),
    );
    const parsed = await simpleParser(source);
    expect(parsed.text).toContain("remove me");
    expect(parsed.messageId).toBe("<original@joinecentic.com>");
    expect(parsed.references).toBe("<conversation@example.com>");
    expect(parsed.bcc).toMatchObject({
      value: [{ address: "earlier-contact@example.org" }],
    });
    expect(parsed.attachments).toHaveLength(0);
    expect(requests).toEqual([
      { uid: 37, part: "1", maxBytes: 2_000_001, decodeText: false },
    ]);
    expect(source.length).toBeLessThan(1500);
  });

  test("retains nested human text and machine-readable delivery status", async () => {
    const { client, requests } = fixture({
      "1.1": { text: Buffer.from("Recipient could not be found.") },
      "2": {
        text: Buffer.from(
          "Final-Recipient: rfc822; missing@example.com\r\nStatus: 5.1.1\r\n",
        ),
        meta: { contentType: "message/delivery-status" },
      },
    });
    const source = await loadDirectMessage(
      client,
      largeMessage({
        type: "multipart/report",
        childNodes: [
          {
            part: "1",
            type: "multipart/alternative",
            childNodes: [{ part: "1.1", type: "text/plain" }],
          },
          { part: "2", type: "message/delivery-status" },
          {
            part: "3",
            type: "message/rfc822",
            childNodes: [{ part: "3.1", type: "text/plain" }],
          },
        ],
      }),
    );
    const parsed = await simpleParser(source);
    expect(parsed.text).toContain("5.1.1");
    expect(parsed.text).toContain("missing@example.com");
    expect(requests.map((request) => request.part)).toEqual(["1.1", "2"]);
  });

  test("does not treat a text file attachment as the recipient's reply", async () => {
    const { client, requests } = fixture({});
    const source = await loadDirectMessage(
      client,
      largeMessage({
        type: "multipart/mixed",
        childNodes: [
          { part: "1", type: "text/plain", disposition: "attachment" },
        ],
      }),
    );
    expect((await simpleParser(source)).text ?? "").toBe("");
    expect(requests).toHaveLength(0);
  });

  test("converts legacy charsets and preserves flowed reply text", async () => {
    const { client } = fixture({
      "1": {
        text: Buffer.from(
          "Renée: please remove \r\nme from future emails.",
          "latin1",
        ),
        meta: {
          contentType: "text/plain",
          charset: "iso-8859-1",
          flowed: true,
        },
      },
    });
    const source = await loadDirectMessage(
      client,
      largeMessage({ type: "text/plain" }),
    );
    const parsed = await simpleParser(source);
    expect(parsed.text).toContain("Renée");
    expect(parsed.text).toContain("remove me");
  });

  test("never exposes stream failure details", async () => {
    const client: Pick<ImapFlow, "download"> = {
      download: async () => ({
        meta: { contentType: "text/plain" },
        content: Readable.from(
          (async function* () {
            yield Buffer.from("Beginning");
            throw new Error("Sensitive provider detail that must not escape");
          })(),
        ),
      }),
    };
    await expect(
      loadDirectMessage(client, largeMessage({ type: "text/plain" })),
    ).rejects.toThrow("Direct mailbox message could not be read safely.");
  });

  test("rejects aggregate text truncation instead of losing a late opt-out", async () => {
    const { client } = fixture({
      "1": { text: Buffer.alloc(1_500_000, "a") },
      "2": { text: Buffer.from(`${"b".repeat(600_000)}\nPlease remove me.`) },
    });
    await expect(
      loadDirectMessage(
        client,
        largeMessage({
          type: "multipart/mixed",
          childNodes: [
            { part: "1", type: "text/plain" },
            { part: "2", type: "text/plain" },
          ],
        }),
      ),
    ).rejects.toThrow("could not be read safely");
  });

  test("rejects unavailable, undecodable, or malformed body data", async () => {
    for (const selected of [
      undefined,
      { text: Buffer.from("text"), meta: { charset: "unknown-charset" } },
      { text: Buffer.from([0xc3, 0x28]) },
    ]) {
      const { client } = fixture(selected ? { "1": selected } : {});
      await expect(
        loadDirectMessage(client, largeMessage({ type: "text/plain" })),
      ).rejects.toThrow("could not be read safely");
    }
    const { client } = fixture({});
    await expect(
      loadDirectMessage(client, {
        ...largeMessage({ type: "text/plain" }),
        headers: Buffer.from(
          "From: sender@example.com\r\n\r\nbody injected here",
        ),
      }),
    ).rejects.toThrow("could not be read safely");
  });

  test("returns exact small message bytes and rejects an incomplete download", async () => {
    const { client, requests } = fixture({});
    const source = Buffer.concat([headers, Buffer.from("Original message")]);
    expect(
      await loadDirectMessage(client, { uid: 1, size: source.length, source }),
    ).toBe(source);
    await expect(
      loadDirectMessage(client, { uid: 1, size: source.length + 1, source }),
    ).rejects.toThrow("could not be read safely");
    expect(requests).toHaveLength(0);
  });
});
