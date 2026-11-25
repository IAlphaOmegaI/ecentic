import { resultify } from "@zenncore/utils";

type ContactLocation = { timezone: string; country: string };
type SchedulingPolicy = { allowUsMarketWindow?: boolean };

export const isTimezone = (timezone: string) =>
  Boolean(timezone) &&
  resultify(() =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(),
  ).success;

/** A market window is an explicit scheduling choice, never a claimed personal timezone. */
export const resolveSendingWindow = (
  location: ContactLocation,
  policy: SchedulingPolicy = {},
) => {
  if (isTimezone(location.timezone))
    return {
      kind: "known-timezone" as const,
      timezone: location.timezone,
      startHour: 8,
      endHour: 14,
    };
  if (
    location.timezone.trim() ||
    !policy.allowUsMarketWindow ||
    !["us", "usa", "united states", "united states of america"].includes(
      location.country.trim().toLowerCase(),
    )
  )
    return null;
  return {
    kind: "us-market-window" as const,
    timezone: "UTC",
    startHour: 18,
    endHour: 21,
  };
};

/** Both modes use Monday–Thursday and an exclusive end time. */
export const inSendWindow = (
  location: ContactLocation | string,
  now = new Date(),
  policy: SchedulingPolicy = {},
) => {
  const window = resolveSendingWindow(
    typeof location === "string"
      ? { timezone: location, country: "" }
      : location,
    policy,
  );
  if (!window) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: window.timezone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return (
    ["Mon", "Tue", "Wed", "Thu"].includes(weekday) &&
    hour >= window.startHour &&
    hour < window.endHour
  );
};
