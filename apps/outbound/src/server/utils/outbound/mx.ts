import { Resolver } from "node:dns/promises";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { ValidationError } from "@/server/utils/error";

export const check = (email: string) =>
  resultify(async () => {
    if (!z.email().safeParse(email).success)
      throw new ValidationError(
        "Save a work email before checking its mail provider.",
      );
    const domain = email.split("@")[1];
    if (!domain) throw new ValidationError("Email domain is missing.");
    const records = await new Resolver({ timeout: 5000, tries: 1 }).resolveMx(
      domain,
    );
    const names = records
      .map((record) => record.exchange.toLowerCase())
      .filter((name) => name && name !== ".");
    const provider = (() => {
      switch (true) {
        case names.some((name) =>
          /(?:^|\.)mail\.protection\.outlook\.com$/.test(name),
        ):
          return "microsoft" as const;
        case names.some((name) => /(?:^|\.)google(?:mail)?\.com$/.test(name)):
          return "google" as const;
        case names.some(Boolean):
          return "other" as const;
        default:
          return "unknown" as const;
      }
    })();
    return { provider, records: names, checkedAt: new Date().toISOString() };
  });
