import { z } from "zod";

export const settingsSections = [
  "account",
  "security",
  "integrations",
  "billing",
] as const;

const sectionSchema = z.enum(settingsSections);

export const resolveSettingsSection = (
  parameters: Pick<URLSearchParams, "get">,
) => {
  const section = sectionSchema.safeParse(parameters.get("tab"));
  if (section.success) return section.data;

  switch (true) {
    case parameters.get("checkout") === "success":
    case parameters.get("payment") === "added":
    case parameters.get("billing") === "connected":
      return "billing";
    case parameters.get("google") !== null:
    case parameters.get("recharge") !== null:
      return "integrations";
    default:
      return "account";
  }
};
