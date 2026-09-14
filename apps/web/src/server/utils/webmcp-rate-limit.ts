import { consume, identify, type Policy, type Verdict } from "./rate-limit";

export const WEBMCP_POLICY: Policy = {
  name: "webmcp-scan",
  limit: 4,
  window: 60,
  keyed: false,
};

// The shared limiter deliberately fails open. Anonymous crawling also keeps a
// bounded process-local fallback so a missing Redis configuration is usable
// without leaving a single instance completely unmetered.
const windows = new Map<string, { count: number; expires: number }>();
const MAX_IDENTITIES = 1000;

export const consumeScan = async (
  caller: Parameters<typeof consume>[0],
): Promise<Verdict> => {
  const verdict = await consume(caller, WEBMCP_POLICY);
  if (verdict.remaining !== null) return verdict;

  const now = Date.now();
  for (const [key, window] of windows)
    if (window.expires <= now) windows.delete(key);

  const identity = identify(caller, { keyed: false });
  const existing = windows.get(identity);
  // Refuse overflow instead of letting identity churn evict a throttled caller.
  if (!existing && windows.size >= MAX_IDENTITIES)
    return { ...verdict, allowed: false, remaining: 0 };

  const window = {
    count: (existing?.count ?? 0) + 1,
    expires: existing?.expires ?? now + WEBMCP_POLICY.window * 1000,
  };
  windows.set(identity, window);
  return {
    ...verdict,
    allowed: window.count <= WEBMCP_POLICY.limit,
    remaining: Math.max(0, WEBMCP_POLICY.limit - window.count),
    reset: Math.ceil((window.expires - now) / 1000),
  };
};
