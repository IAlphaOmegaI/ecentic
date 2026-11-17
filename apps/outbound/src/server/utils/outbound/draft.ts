import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  lintMessages,
  type Playbook,
  type ProspectInput,
  personalSourceReadyForDraft,
  renderMessages,
} from "@/lib/outbound";
import {
  buildDraftPrompt,
  preservesDraftControls,
} from "@/lib/outbound-writing";
import * as AI from "@/server/utils/ai";
import { ValidationError } from "@/server/utils/error";
import { evidenceForDraft } from "./shopping-research";

/** Only polish approved factual inputs. Source text is data, never instructions. */
export const generateDraft = async (
  prospect: ProspectInput,
  settings: Playbook,
) => {
  const research = await evidenceForDraft(prospect, settings);
  if (!research.success) return research;
  if (!personalSourceReadyForDraft(prospect, settings))
    return {
      success: false as const,
      error: new ValidationError(
        "Reopen and date the personal source before drafting, or remove the personal line.",
      ),
    };
  if (!prospect.product || !prospect.finding || !prospect.evidence)
    return {
      success: false as const,
      error: new ValidationError(
        "Research a product before generating a draft.",
      ),
    };
  const rendered = renderMessages(prospect, settings);
  const first = rendered[0];
  if (!first)
    return {
      success: false as const,
      error: new ValidationError("The first-message template is missing."),
    };
  const generated = await resultify(() =>
    AI.generate({
      model: "gpt",
      label: "outbound-draft",
      output: z.object({ subject: z.string(), body: z.string() }),
      ...buildDraftPrompt(prospect, settings, research.data),
    }),
  );
  if (!generated.success) return generated;
  if (
    !preservesDraftControls(generated.data.body, first.body, settings, prospect)
  )
    return {
      success: false as const,
      error: new ValidationError(
        "The generated draft changed a protected template line. Try drafting again or edit the message manually.",
      ),
    };
  const messages = [
    { ...first, ...generated.data },
    ...rendered.slice(1).map((message) => ({
      ...message,
      subject: `Re: ${generated.data.subject}`,
    })),
  ];
  return {
    success: true as const,
    data: { messages, issues: lintMessages(messages, settings, prospect) },
  };
};
