import { resultify } from "@zenncore/utils";
import {
  lintMessages,
  type Playbook,
  type ProspectInput,
  personalSourceReadyForDraft,
  renderMessages,
  settingsForSender,
} from "@/lib/outbound";
import {
  applyDraftEdits,
  buildDraftPrompt,
  draftBodyIssues,
  draftEditsSchema,
} from "@/lib/outbound-writing";
import * as AI from "@/server/utils/ai";
import { ValidationError } from "@/server/utils/error";
import { evidenceForDraft } from "./shopping-research";

/** Only polish approved factual inputs. Source text is data, never instructions. */
export const generateDraft = async (
  prospect: ProspectInput,
  policy: Playbook,
) => {
  const settings = settingsForSender(
    policy,
    prospect.assignedSenderEmail ?? policy.fromEmail,
  );
  if (
    !settings.fromName ||
    !settings.signature ||
    !settings.founderLine ||
    !settings.productCheckIntro
  )
    return {
      success: false as const,
      error: new ValidationError(
        "Save this inbox's sender profile before drafting.",
      ),
    };
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
  if (draftBodyIssues(rendered, settings, prospect).length)
    return {
      success: true as const,
      data: {
        messages: rendered,
        issues: lintMessages(rendered, settings, prospect),
      },
    };
  const generated = await resultify(() =>
    AI.generate({
      model: "gpt",
      label: "outbound-draft",
      output: draftEditsSchema(prospect, settings),
      ...buildDraftPrompt(prospect, settings, research.data),
    }),
  );
  if (!generated.success) return generated;
  return {
    success: true as const,
    data: applyDraftEdits(prospect, settings, generated.data),
  };
};
