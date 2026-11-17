import "server-only";

import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import type {
  FetchMessageObject,
  ImapFlow,
  MessageStructureObject,
} from "imapflow";

const SOURCE_LIMIT = 2_000_000;
const HEADER_LIMIT = 64_000;
const REBUILT_SOURCE_LIMIT = 2_100_000;
const TEXT_TYPES = new Set([
  "text/plain",
  "text/html",
  "message/delivery-status",
]);
type Message = Pick<
  FetchMessageObject,
  "uid" | "size" | "source" | "headers" | "bodyStructure"
>;
type TextPart = { part: string; type: string };

const unreadable = () =>
  new Error("Direct mailbox message could not be read safely.");

const textParts = (structure: MessageStructureObject): TextPart[] => {
  const budget = { nodes: 0 };
  const visit = (node: MessageStructureObject, depth: number): TextPart[] => {
    budget.nodes += 1;
    if (depth > 30 || budget.nodes > 256) throw unreadable();
    const type = node.type.toLowerCase();
    if (
      node.disposition?.toLowerCase() === "attachment" ||
      node.dispositionParameters?.["filename"] ||
      node.parameters?.["name"] ||
      type === "message/rfc822"
    )
      return [];
    if (type.startsWith("multipart/")) {
      if (!node.childNodes?.length) throw unreadable();
      return node.childNodes.flatMap((child) => visit(child, depth + 1));
    }
    if (!TEXT_TYPES.has(type)) return [];
    if (node.childNodes?.length) throw unreadable();
    const part = node.part ?? (depth === 0 ? "1" : "");
    if (!/^\d+(?:\.\d+)*$/.test(part)) throw unreadable();
    return [{ part, type }];
  };
  const parts = visit(structure, 0);
  if (
    parts.length > 64 ||
    new Set(parts.map(({ part }) => part)).size !== parts.length
  )
    throw unreadable();
  return parts;
};

const retainedHeaders = (headers: Buffer) => {
  if (!headers.length || headers.length > HEADER_LIMIT || headers.includes(0))
    throw unreadable();
  // Latin-1 is only a reversible byte mapping here; encoded address/subject headers
  // are preserved exactly for Mailparser to decode later.
  const source = headers.toString("latin1");
  const [head, ...trailing] = source.split(/\r?\n\r?\n/);
  if (!head || trailing.some((part) => part.trim())) throw unreadable();
  const fields = head.replace(/\r?\n$/, "").split(/\r?\n(?![ \t])/);
  if (
    fields.length > 1000 ||
    fields.some((field) => !/^[!-9;-~]+:/.test(field))
  )
    throw unreadable();
  const replaced = new Set([
    "content-type",
    "content-transfer-encoding",
    "content-length",
    "content-disposition",
    "mime-version",
  ]);
  return Buffer.from(
    fields
      .filter(
        (field) =>
          !replaced.has(field.slice(0, field.indexOf(":")).toLowerCase()),
      )
      .join("\r\n"),
    "latin1",
  );
};

/** Load message text without downloading large attachment payloads. */
export const loadDirectMessage = async (
  client: Pick<ImapFlow, "download">,
  message: Message,
): Promise<Buffer> => {
  if (!Number.isSafeInteger(message.size) || (message.size ?? 0) < 0)
    throw unreadable();
  if ((message.size ?? 0) <= SOURCE_LIMIT) {
    if (!message.source || message.source.length !== message.size)
      throw unreadable();
    return message.source;
  }
  if (!message.headers || !message.bodyStructure) throw unreadable();
  const headers = retainedHeaders(message.headers);
  const parts = textParts(message.bodyStructure);
  const bodies: Array<{
    type: string;
    content: Buffer;
    flowed?: boolean;
    delSp?: boolean;
  }> = [];
  const budget = { bytes: 0 };
  for (const part of parts) {
    const remaining = SOURCE_LIMIT - budget.bytes;
    const downloaded = await resultify(() =>
      client.download(message.uid, part.part, {
        uid: true,
        maxBytes: remaining + 1,
        decodeText: false,
      }),
    );
    if (!downloaded.success || !downloaded.data.content) throw unreadable();
    const { content, meta } = downloaded.data;
    const read = await resultify(async () => {
      if (
        (meta.contentType && meta.contentType.toLowerCase() !== part.type) ||
        meta.disposition === "attachment"
      )
        throw unreadable();
      const decoder = new TextDecoder(meta.charset ?? "utf-8", { fatal: true });
      const chunks: Buffer[] = [];
      const size = { bytes: 0 };
      for await (const value of content) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        size.bytes += chunk.length;
        if (size.bytes > remaining) throw unreadable();
        chunks.push(chunk);
      }
      // Bound bytes before charset or flowed conversion: ImapFlow's intermediate
      // decoder limits may otherwise return less than maxBytes after truncating.
      const body = Buffer.from(
        decoder.decode(Buffer.concat(chunks, size.bytes)),
        "utf8",
      );
      if (body.length > remaining) throw unreadable();
      return body;
    });
    content.destroy();
    if (!read.success) throw unreadable();
    budget.bytes += read.data.length;
    bodies.push({
      type: part.type,
      content: read.data,
      flowed: meta.flowed,
      delSp: meta.delSp,
    });
  }
  const boundary = `ecentic-${randomUUID()}`;
  if (bodies.some((body) => body.content.includes(boundary)))
    throw unreadable();
  const source = Buffer.concat([
    headers,
    Buffer.from(
      `\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`,
    ),
    ...bodies.flatMap((body) => [
      Buffer.from(
        `--${boundary}\r\nContent-Type: ${body.type}; charset=UTF-8${body.flowed ? `; format=flowed${body.delSp ? "; delsp=yes" : ""}` : ""}\r\nContent-Transfer-Encoding: 8bit\r\n\r\n`,
      ),
      body.content,
      Buffer.from("\r\n"),
    ]),
    Buffer.from(`--${boundary}--\r\n`),
  ]);
  if (source.length > REBUILT_SOURCE_LIMIT) throw unreadable();
  return source;
};
