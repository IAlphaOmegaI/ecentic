import Image from "next/image";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";

const agents = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Perplexity", logo: perplexity },
] as const;

export const AgentStrip = ({ label }: AgentStrip.Props) => (
  <div className="flex flex-col gap-3">
    <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.16em]">
      {label}
    </p>
    <ul className="flex flex-wrap gap-2">
      {agents.map((agent) => (
        <li
          key={agent.name}
          className="flex items-center gap-2 rounded-full border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm"
        >
          <Image src={agent.logo} alt="" className="size-4" />
          {agent.name}
        </li>
      ))}
    </ul>
  </div>
);

export namespace AgentStrip {
  export type Props = {
    label: string;
  };
}
