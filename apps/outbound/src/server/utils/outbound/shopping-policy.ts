import { createHash } from "node:crypto";
import type { Playbook } from "@/lib/outbound";

/** Wording and delivery settings do not change what was actually observed. */
export const researchPolicyHash = (settings: Playbook) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        instructions: settings.researchInstructions,
        required: settings.requireShoppingEvidence,
      }),
    )
    .digest("hex");
