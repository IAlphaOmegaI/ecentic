#!/usr/bin/env node
import {
  formatBody,
  formatFailure,
  formatRateLimit,
  parseOptions,
  plan,
} from "./commands";

const VERSION = "0.1.0";

const run = async () => {
  const argv = process.argv.slice(2);
  const step = plan(argv, process.env, VERSION);

  if (step.kind === "help") {
    process.stdout.write(step.text);
    return 0;
  }

  if (step.kind === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (step.kind === "error") {
    process.stderr.write(`${step.message}\n`);
    return 2;
  }

  const response = await fetch(step.url, {
    method: step.method,
    headers: step.headers,
    body: step.body,
  }).catch((error: unknown) => error as Error);

  if (response instanceof Error) {
    process.stderr.write(`Could not reach ${step.url}: ${response.message}\n`);
    return 1;
  }

  const text = await response.text();
  const payload = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  })();

  const note = formatRateLimit(response.headers);
  if (note) process.stderr.write(`${note}\n`);

  if (!response.ok) {
    process.stderr.write(`${formatFailure(response.status, payload)}\n`);
    return 1;
  }

  process.stdout.write(
    `${formatBody(payload, parseOptions(argv, process.env).pretty)}\n`,
  );
  return 0;
};

process.exitCode = await run();
