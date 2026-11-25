import { describe, expect, test } from "bun:test";
import { IntegrationError } from "@/server/utils/outbound/http";
import {
  sanitizeSmtpFailure,
  smtpFailureFrom,
} from "@/server/utils/outbound/smtp-failure";

describe("SMTP failure diagnostics", () => {
  test("drops command arguments, unknown codes and non-numeric responses", () => {
    expect(
      sanitizeSmtpFailure({
        command: "RCPT TO:<private@example.com>",
        code: "EENVELOPE",
        responseCode: "550",
        response: "550 private@example.com rejected",
      }),
    ).toEqual({ command: null, code: "EENVELOPE", responseCode: null });
    for (const responseCode of [99, 600, 550.1, Number.NaN])
      expect(
        sanitizeSmtpFailure({
          command: "AUTH PLAIN private-secret",
          code: "private-secret",
          responseCode,
        }),
      ).toBeNull();
    expect(sanitizeSmtpFailure(null)).toBeNull();
    expect(sanitizeSmtpFailure(new Error("private-secret"))).toBeNull();
  });

  test("revalidates structured receipts before audit persistence", () => {
    const smtp = {
      command: "DATA",
      code: "ETIMEDOUT",
      responseCode: null,
    } as const;
    const error = (provider: "google" | "apollo", receipt: unknown) =>
      new IntegrationError(provider, "uncertain", "generic", 502, null, null, {
        smtp: receipt,
      });
    expect(smtpFailureFrom(error("google", smtp))).toEqual(smtp);
    expect(smtpFailureFrom(error("apollo", smtp))).toBeNull();
    expect(
      smtpFailureFrom(error("google", { ...smtp, response: "secret" })),
    ).toBeNull();
    expect(
      smtpFailureFrom(error("google", { ...smtp, command: "DATA secret" })),
    ).toBeNull();
    expect(smtpFailureFrom({ receipt: { smtp } })).toBeNull();
  });
});
