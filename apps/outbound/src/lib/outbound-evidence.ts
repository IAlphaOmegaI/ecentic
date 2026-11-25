/** Reusing an older observation never changes when it was actually captured. */
export const evidenceDateUsable = (
  value: string,
  settings: { verificationDays: number; allowStaleEvidence?: boolean },
  now = Date.now(),
) => {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    (settings.allowStaleEvidence === true ||
      now - timestamp < settings.verificationDays * 86_400_000)
  );
};
