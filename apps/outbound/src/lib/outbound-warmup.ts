import { z } from "zod";

/** A pacing plan is not proof of reputation, inbox placement or approval to send. */
export const warmupPlanSchema = z
  .object({
    enabled: z.boolean(),
    initialDailyCap: z.number().int().min(1).max(15),
    dailyIncrease: z.number().int().min(0).max(5),
    maximumDailyCap: z.number().int().min(1).max(15),
  })
  .strict()
  .refine((plan) => plan.initialDailyCap <= plan.maximumDailyCap, {
    path: ["maximumDailyCap"],
    message: "The maximum must be at least the starting volume.",
  });
export type WarmupPlan = z.infer<typeof warmupPlanSchema>;
export const defaultWarmupPlan: WarmupPlan = {
  enabled: false,
  initialDailyCap: 2,
  dailyIncrease: 1,
  maximumDailyCap: 15,
};

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const capacitySchema = z.object({
  healthyDays: count,
  policyDailyCap: count,
  inboxDailyCap: count,
  usedLast24Hours: count,
  reservedFollowups: count,
  providerHold: z.boolean(),
});
export type WarmupCapacity = z.infer<typeof capacitySchema>;

/** Advance only with recorded healthy days, never merely because calendar time passed. */
export const planWarmup = (input: WarmupPlan, capacity: WarmupCapacity) => {
  const plan = warmupPlanSchema.parse(input);
  const observed = capacitySchema.parse(capacity);
  const dailyCap = Math.min(
    plan.initialDailyCap + plan.dailyIncrease * observed.healthyDays,
    plan.maximumDailyCap,
    observed.policyDailyCap,
    observed.inboxDailyCap,
  );
  const available = Math.max(
    0,
    dailyCap - observed.usedLast24Hours - observed.reservedFollowups,
  );
  return {
    dailyCap,
    remaining: plan.enabled && !observed.providerHold ? available : 0,
    status: !plan.enabled
      ? ("off" as const)
      : observed.providerHold
        ? ("held" as const)
        : ("planned" as const),
    healthyDays: observed.healthyDays,
  };
};

export type ReadinessState = "present" | "missing" | "invalid" | "unknown";
export type DnsObservation = {
  state: ReadinessState;
  records: string[];
};
export type DomainReadiness = {
  domain: string;
  checkedAt: string;
  mx: DnsObservation;
  spf: DnsObservation;
  dkim: DnsObservation & { selectors: string[] };
  dmarc: DnsObservation & {
    recordDomain: string;
    inherited: boolean;
    policy: "none" | "quarantine" | "reject" | null;
  };
  scope: "dns-records";
  inboxPlacement: "unknown";
};

export type MailboxReadinessInput = {
  domain: DomainReadiness;
  connected: boolean;
  synchronized: boolean;
  providerError: boolean;
  historyConfirmed: boolean;
  allowIncompleteHistory?: boolean;
  senderTested: boolean;
};

export type MailboxCheck = {
  domain: DomainReadiness;
  checkedAt: string;
  connection: "verified" | "missing" | "failed";
  connectionVersion: number | null;
  synchronized: boolean;
  historyConfirmed: boolean;
  allowIncompleteHistory?: boolean;
  senderTested: boolean;
  report: ReturnType<typeof assessMailboxReadiness>;
};

/** Keep observations distinct; a green DNS check must never become a fabricated warm score. */
export const assessMailboxReadiness = (input: MailboxReadinessInput) => {
  const checks = [
    ...(["mx", "spf", "dkim", "dmarc"] as const).map((key) => ({
      key,
      state: input.domain[key].state,
    })),
    {
      key: "connection" as const,
      state: input.connected ? ("present" as const) : ("missing" as const),
    },
    {
      key: "sync" as const,
      state: input.synchronized ? ("present" as const) : ("unknown" as const),
    },
    {
      key: "provider" as const,
      state: input.providerError ? ("invalid" as const) : ("present" as const),
    },
    {
      key:
        input.allowIncompleteHistory && !input.historyConfirmed
          ? ("historyOptional" as const)
          : ("history" as const),
      state:
        input.historyConfirmed || input.allowIncompleteHistory
          ? ("present" as const)
          : ("unknown" as const),
    },
    {
      key: "test" as const,
      state: input.senderTested ? ("present" as const) : ("unknown" as const),
    },
  ];
  return {
    checks,
    status: checks.some((check) => ["missing", "invalid"].includes(check.state))
      ? ("needsAttention" as const)
      : checks.some((check) => check.state === "unknown")
        ? ("needsChecks" as const)
        : ("checksPassed" as const),
    inboxPlacement: "unknown" as const,
    reputation: "unknown" as const,
  };
};
