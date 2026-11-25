import { describe, expect, test } from "bun:test";
import { MAX_DAILY_EMAILS, sendingCapacity } from "@/lib/outbound-capacity";

const now = new Date("2026-11-15T20:00:00Z");
describe("email volume ramp", () => {
  test("a new mailbox starts at15 and an old idle mailbox cannot age into50", () => {
    expect(sendingCapacity(50, [], now).dailyCap).toBe(15);
    expect(
      sendingCapacity(50, [{ day: "2026-10-01", accepted: 1, bounced: 0 }], now)
        .dailyCap,
    ).toBe(15);
  });
  test("each completed day must meet its current cap; today never advances the ramp", () => {
    expect(
      sendingCapacity(
        50,
        [
          { day: "2026-11-10", accepted: 15, bounced: 0 },
          { day: "2026-11-11", accepted: 19, bounced: 0 },
          { day: "2026-11-12", accepted: 20, bounced: 0 },
          { day: "2026-11-15", accepted: 50, bounced: 0 },
        ],
        now,
      ).dailyCap,
    ).toBe(25);
  });
  test("a bounce resets the ramp to its initial volume and lower configured caps win", () => {
    expect(
      sendingCapacity(
        50,
        [{ day: "2026-11-10", accepted: 50, bounced: 1 }],
        now,
      ),
    ).toMatchObject({ dailyCap: 15, rampHeld: true });
    expect(
      sendingCapacity(8, [{ day: "2026-11-10", accepted: 50, bounced: 0 }], now)
        .dailyCap,
    ).toBe(8);
    expect(
      sendingCapacity(
        500,
        Array.from({ length: 30 }, (_, index) => ({
          day: `2026-10-${String(index + 1).padStart(2, "0")}`,
          accepted: 100,
          bounced: 0,
        })),
        now,
      ).dailyCap,
    ).toBe(MAX_DAILY_EMAILS);
  });
  test("an explicit ramp opt-out uses the configured cap and keeps the hard ceiling", () => {
    expect(sendingCapacity(50, [], now, { rampEnabled: false })).toEqual({
      target: 50,
      dailyCap: 50,
      rampHeld: false,
    });
    expect(sendingCapacity(8, [], now, { rampEnabled: false }).dailyCap).toBe(
      8,
    );
    expect(sendingCapacity(51, [], now, { rampEnabled: false }).dailyCap).toBe(
      51,
    );
    expect(sendingCapacity(500, [], now, { rampEnabled: false }).dailyCap).toBe(
      MAX_DAILY_EMAILS,
    );
  });
  test("disabling the ramp does not override observed bounce protection", () => {
    expect(
      sendingCapacity(
        50,
        [{ day: "2026-11-14", accepted: 50, bounced: 1 }],
        now,
        { rampEnabled: false },
      ),
    ).toEqual({ target: 50, dailyCap: 15, rampHeld: true });
  });
});
