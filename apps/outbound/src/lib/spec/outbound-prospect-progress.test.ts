import { describe, expect, test } from "bun:test";
import type { Prospect } from "../outbound";
import {
  type ProspectProgress,
  prospectLifecycles,
} from "../outbound-prospect-progress";

const prospect: Pick<
  Prospect,
  "status" | "sentStep" | "messages" | "approvalHash"
> = {
  status: "candidate",
  sentStep: 0,
  messages: [],
  approvalHash: null,
};
const progress: ProspectProgress = {
  prospectId: "prospect",
  nextSendAt: null,
  research: null,
};
const message = {
  step: 1 as const,
  afterDays: 0,
  subject: "Subject",
  body: "Message",
};

describe("prospect lifecycle filters", () => {
  test("does not invent research or scheduling from a candidate or unapproved draft", () => {
    expect(prospectLifecycles(prospect)).toEqual([]);
    expect(
      prospectLifecycles(
        { ...prospect, status: "draft", messages: [message] },
        progress,
      ),
    ).toEqual([]);
  });
  test("research requires an observed queued or running job", () => {
    expect(
      prospectLifecycles(prospect, { ...progress, research: "queued" }),
    ).toEqual(["researching"]);
    expect(
      prospectLifecycles(prospect, { ...progress, research: "complete" }),
    ).toEqual([]);
  });
  test("scheduled requires a saved next-send time and eligible approved sequence", () => {
    const approved = {
      ...prospect,
      status: "approved" as const,
      messages: [message],
      approvalHash: "hash",
    };
    expect(prospectLifecycles(approved, progress)).toEqual([]);
    expect(
      prospectLifecycles(approved, {
        ...progress,
        nextSendAt: "2026-11-15T18:00:00Z",
      }),
    ).toEqual(["scheduled"]);
    expect(
      prospectLifecycles(
        { ...approved, approvalHash: null },
        { ...progress, nextSendAt: "2026-11-15T18:00:00Z" },
      ),
    ).toEqual([]);
  });
  test("sent remains findable after reply, while replied cannot remain scheduled", () => {
    expect(
      prospectLifecycles(
        {
          ...prospect,
          status: "replied",
          sentStep: 1,
          messages: [message],
          approvalHash: "hash",
        },
        { ...progress, nextSendAt: "2026-11-15T18:00:00Z" },
      ),
    ).toEqual(["sent", "replied"]);
  });
  test("uncertain preparation is held and finished sequences are not scheduled", () => {
    expect(
      prospectLifecycles(prospect, { ...progress, research: "uncertain" }),
    ).toEqual(["held"]);
    expect(
      prospectLifecycles(
        {
          ...prospect,
          status: "finished",
          sentStep: 1,
          messages: [message],
          approvalHash: "hash",
        },
        { ...progress, nextSendAt: "2026-11-15T18:00:00Z" },
      ),
    ).toEqual(["sent"]);
  });
});
