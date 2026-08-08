#!/usr/bin/env bun
/**
 * Publish DNS for AI Discovery (DNS-AID) HTTPS records for ecentic.ai.
 *
 * Requires Vercel CLI auth (same token as `vercel login`) and team access
 * to the zennit scope. Vercel DNS does not support DNSSEC; authenticating
 * the zone requires moving nameservers to a DNSSEC-capable provider.
 *
 * @see https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/
 * @see https://www.rfc-editor.org/rfc/rfc9460
 *
 * Usage:
 *   bun apps/web/scripts/publish-dns-aid.ts
 *   VERCEL_TOKEN=… TEAM_ID=… bun apps/web/scripts/publish-dns-aid.ts
 */

import { homedir } from "node:os";
import { join } from "node:path";

const DOMAIN = "ecentic.ai";
const TEAM_SLUG = "zennit";

const records = [
  {
    name: "_index._agents",
    params: 'alpn="h3,h2" port=443',
    comment: "DNS-AID index entrypoint (RFC 9460 HTTPS)",
  },
  {
    name: "_mcp._agents",
    params: 'alpn="h3,h2" port=443 mandatory=alpn,port',
    comment: "DNS-AID MCP entrypoint",
  },
] as const;

const readJson = async (path: string) => {
  try {
    return JSON.parse(await Bun.file(path).text()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const resolveToken = async () => {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const auth = await readJson(
    join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"),
  );
  const token = auth?.token;
  if (typeof token === "string" && token.length > 0) return token;
  throw new Error("No Vercel token. Run `vercel login` or set VERCEL_TOKEN.");
};

const resolveTeamId = async (token: string) => {
  if (process.env.TEAM_ID) return process.env.TEAM_ID;
  const response = await fetch("https://api.vercel.com/v2/teams", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to list teams: ${response.status}`);
  }
  const body = (await response.json()) as {
    teams?: Array<{ id: string; slug: string }>;
  };
  const team = body.teams?.find((entry) => entry.slug === TEAM_SLUG);
  if (!team) throw new Error(`Team "${TEAM_SLUG}" not found for this token.`);
  return team.id;
};

const listHttpsNames = async (token: string, teamId: string) => {
  const response = await fetch(
    `https://api.vercel.com/v2/domains/${DOMAIN}/records?teamId=${teamId}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    throw new Error(`Failed to list DNS records: ${response.status}`);
  }
  const body = (await response.json()) as {
    records?: Array<{ name: string; type: string }>;
  };
  return new Set(
    (body.records ?? [])
      .filter((record) => record.type === "HTTPS")
      .map((record) => record.name),
  );
};

const publish = async (
  token: string,
  teamId: string,
  record: (typeof records)[number],
) => {
  const response = await fetch(
    `https://api.vercel.com/v2/domains/${DOMAIN}/records?teamId=${teamId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: record.name,
        type: "HTTPS",
        ttl: 3600,
        https: {
          priority: 1,
          target: `${DOMAIN}.`,
          params: record.params,
        },
        comment: record.comment,
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to create ${record.name}: ${response.status} ${text}`,
    );
  }
  console.log(`created ${record.name}. ${DOMAIN} → ${text}`);
};

const main = async () => {
  const token = await resolveToken();
  const teamId = await resolveTeamId(token);
  const existing = await listHttpsNames(token, teamId);

  for (const record of records) {
    if (existing.has(record.name)) {
      console.log(`skip ${record.name} (HTTPS already present)`);
      continue;
    }
    await publish(token, teamId, record);
  }

  console.log(`
Verify:
  dig +short HTTPS _index._agents.${DOMAIN}
  dig +short HTTPS _mcp._agents.${DOMAIN}

Note: Vercel DNS does not sign zones with DNSSEC. isitagentready may still
pass the record check; AD=true requires a DNSSEC-capable provider + DS at
the registrar.
`);
};

await main();
