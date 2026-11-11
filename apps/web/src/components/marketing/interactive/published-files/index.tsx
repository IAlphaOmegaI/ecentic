import { getMessages } from "next-intl/server";
import { StepPlayer } from "../step-player";
import { PublishedFilePreview } from "./preview";

const paths = [
  "/llms.txt",
  "/.well-known/api-catalog",
  "/ucp/agent-profile",
  "/api/mcp",
] as const;
export const PublishedFiles = async () => {
  const { interactiveFiles } = await getMessages();
  const steps = paths.map((path, index) => ({
    id: path,
    label: interactiveFiles.tabs[index] ?? path,
    content: <PublishedFilePreview path={path} copy={interactiveFiles} />,
  }));
  return (
    <div
      data-interactive="published-files"
      className="border-accent-foreground border-t bg-background-dimmed"
    >
      <div className="px-8 py-8 max-sm:px-4">
        <h3>{interactiveFiles.title}</h3>
        <p className="mt-4 text-foreground">{interactiveFiles.description}</p>
      </div>
      <StepPlayer label={interactiveFiles.title} steps={steps} />
    </div>
  );
};
