import { getMessages } from "next-intl/server";
import { PublishedFilesExplorer } from "./selector";

export const PublishedFiles = async () => {
  const { interactiveFiles } = await getMessages();
  return <PublishedFilesExplorer copy={interactiveFiles} />;
};
