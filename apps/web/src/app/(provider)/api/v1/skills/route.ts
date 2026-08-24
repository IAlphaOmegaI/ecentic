import { isSkillName, skillsIndex } from "@/lib/agent-api";
import { preflight, refused, served } from "@/server/utils/public-api";

export const GET = (request: Request) => {
  const name = new URL(request.url).searchParams.get("name");
  if (name !== null && !isSkillName(name))
    return refused(
      request,
      "validation-failed",
      `Unknown skill "${name}". Omit the parameter to list every skill.`,
    );

  return served(request, skillsIndex(name ?? undefined));
};

export const OPTIONS = preflight;
