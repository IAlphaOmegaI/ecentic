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
