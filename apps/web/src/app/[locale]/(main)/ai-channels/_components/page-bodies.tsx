import { AmazonBody } from "./page-bodies/amazon";
import { ChatgptBody } from "./page-bodies/chatgpt";
import { ClaudeBody } from "./page-bodies/claude";
import { GoogleAiModeGeminiBody } from "./page-bodies/google-ai-mode-gemini";
import { MicrosoftCopilotBody } from "./page-bodies/microsoft-copilot";
import { PerplexityBody } from "./page-bodies/perplexity";

export const pageBodies = {
  google: GoogleAiModeGeminiBody,
  chatgpt: ChatgptBody,
  claude: ClaudeBody,
  copilot: MicrosoftCopilotBody,
  perplexity: PerplexityBody,
  amazon: AmazonBody,
};
