export const formatRelativeTime = (date: Date, locale: string): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  switch (true) {
    case diffMinutes < 1:
      return formatter.format(0, "second");
    case diffMinutes < 60:
      return formatter.format(-diffMinutes, "minute");
    case diffHours < 24:
      return formatter.format(-diffHours, "hour");
    case diffDays < 7:
      return formatter.format(-diffDays, "day");
    default:
      return date.toLocaleDateString(locale);
  }
};

export const formatElapsed = (ms: number, locale: string) => {
  const seconds = ms / 1000;
  const secondsFormatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "second",
    unitDisplay: "short",
    maximumFractionDigits: seconds < 60 ? 1 : 0,
  });
  const minutesFormatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "short",
    maximumFractionDigits: 0,
  });
  return seconds < 60
    ? secondsFormatter.format(seconds)
    : `${minutesFormatter.format(Math.floor(seconds / 60))} ${secondsFormatter.format(seconds % 60)}`;
};
