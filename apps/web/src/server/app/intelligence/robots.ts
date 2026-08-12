/**
 * robots.txt parsing shared by the agent-readiness audit and the brand
 * visibility crawlability check. Kept outside the "use server" modules so both
 * can import plain helpers.
 */

/**
 * Crawlers that decide AI visibility. `Googlebot` gates the Shopping Graph
 * page verification; `Google-Extended` gates Gemini grounding; the rest are
 * the OpenAI/Anthropic/Perplexity index and on-demand fetchers.
 */
export const CRITICAL_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
];

export type RobotsGroup = {
  agents: string[];
  disallow: string[];
  allow: string[];
};

export const parseRobots = (body: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  const lines = body.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    switch (true) {
      case directive === "user-agent": {
        const current = groups[groups.length - 1];
        // Consecutive user-agent lines share one group; a user-agent line
        // after rules starts a new group.
        if (
          current &&
          current.disallow.length === 0 &&
          current.allow.length === 0 &&
          current.agents.length > 0
        ) {
          current.agents.push(value.toLowerCase());
          break;
        }
        groups.push({ agents: [value.toLowerCase()], disallow: [], allow: [] });
        break;
      }
      case directive === "disallow": {
        groups[groups.length - 1]?.disallow.push(value);
        break;
      }
      case directive === "allow": {
        groups[groups.length - 1]?.allow.push(value);
        break;
      }
      default:
        break;
    }
  }

  return groups;
};

export const isCrawlerBlocked = (
  groups: RobotsGroup[],
  crawler: string,
): boolean => {
  const name = crawler.toLowerCase();
  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && name.includes(agent)),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));

  return applicable.some(
    (group) =>
      group.disallow.some((path) => path === "/") &&
      !group.allow.some((path) => path === "/"),
  );
};

/**
 * Whether robots.txt addresses any AI crawler by name (as opposed to only
 * `*` groups). Named groups signal deliberate AI policy — their absence means
 * access is only implicit.
 */
export const hasAiSpecificRules = (groups: RobotsGroup[]): boolean => {
  const aiAgents = CRITICAL_CRAWLERS.map((crawler) => crawler.toLowerCase());
  return groups.some((group) =>
    group.agents.some(
      (agent) =>
        agent !== "*" && aiAgents.some((known) => known.includes(agent)),
    ),
  );
};
