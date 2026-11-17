import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as HTTP from "@/server/utils/http";
import * as Google from "@/server/utils/outbound/google";

afterEach(() => mock.restore());
const encoded = (text: string) => Buffer.from(text).toString("base64url");
const response = (payload: unknown, snippet = "Short preview") =>
  spyOn(HTTP, "request").mockResolvedValue({
    success: true,
    data: Response.json({
      id: "message_fixture",
      threadId: "thread_fixture",
      historyId: "1",
      internalDate: "1",
      snippet,
      payload,
    }),
  });
describe("Gmail conversation body retention", () => {
  test("HTML-only correspondence retains the full decoded text and excludes attachments", async () => {
    response({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "text/html",
          body: {
            data: encoded(
              "<p>A complete reply &amp; useful context.</p><p>More details follow here.</p>",
            ),
          },
        },
        {
          mimeType: "text/plain",
          filename: "notes.txt",
          body: {
            data: encoded("Attachment content must not become the reply."),
          },
        },
      ],
    });
    const result = await Google.getMessage({
      accessToken: "fixture",
      message: "message_fixture",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.text).toContain("A complete reply & useful context.");
    expect(result.data.text).toContain("More details follow here.");
    expect(result.data.text).not.toContain("Attachment");
    expect(result.data.textTruncated).toBe(false);
  });
  test("plain text wins over an HTML alternative and attachment disposition is respected", async () => {
    response({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: { data: encoded("Original plain text.") },
            },
            {
              mimeType: "text/html",
              body: { data: encoded("<p>HTML alternative.</p>") },
            },
          ],
        },
        {
          mimeType: "text/plain",
          headers: [{ name: "Content-Disposition", value: "attachment" }],
          body: { data: encoded("Private attachment.") },
        },
      ],
    });
    const result = await Google.getMessage({
      accessToken: "fixture",
      message: "message_fixture",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.text).toBe("Original plain text.");
    expect(result.data.textTruncated).toBe(false);
  });
  test("snippet-only and oversized messages are marked incomplete so they cannot be used for a reply", async () => {
    const requested = response({});
    const short = await Google.getMessage({
      accessToken: "fixture",
      message: "message_fixture",
    });
    expect(short.success && short.data.textTruncated).toBe(true);
    requested.mockRestore();
    response({
      mimeType: "text/plain",
      body: { data: encoded("x".repeat(50001)) },
    });
    const long = await Google.getMessage({
      accessToken: "fixture",
      message: "message_fixture",
    });
    expect(long.success && long.data.text.length).toBe(50000);
    expect(long.success && long.data.textTruncated).toBe(true);
  });
});
