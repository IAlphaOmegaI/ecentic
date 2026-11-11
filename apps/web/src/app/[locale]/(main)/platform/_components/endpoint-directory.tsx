import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { Plus } from "@/components/plus";

export const PlatformEndpointDirectory = ({
  copy,
  note,
}: {
  copy: AppConfig["Messages"]["interactiveFiles"];
  note?: string;
}) => {
  const endpoints = [
    { path: "/llms.txt", title: copy.tabs[0], icon: CommerceFilePenIcon },
    { path: "/openapi.json", title: "OpenAPI", icon: CommerceCode_3Icon },
    {
      path: "/.well-known/api-catalog",
      title: copy.tabs[1],
      icon: CommerceGlobePointerIcon,
    },
    {
      path: "/.well-known/oauth-authorization-server",
      title: "OAuth 2.0",
      icon: CommerceFileShieldIcon,
    },
    {
      path: "/ucp/agent-profile",
      title: copy.tabs[2],
      icon: CommerceBasketShoppingIcon,
    },
    { path: "/mcp", title: copy.tabs[3], icon: CommercePlug_3SparkleIcon },
  ];
  return (
    <div
      data-endpoint-directory
      className="relative min-w-0 border-accent-foreground border-l bg-background-rich max-md:border-t max-md:border-l-0"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
      <div className="relative overflow-hidden border-accent-foreground border-b bg-linear-to-br from-primary/8 via-transparent to-transparent px-7 py-7 max-sm:px-4">
        <p className="font-mono text-primary-text text-xl">ecentic.ai</p>
        <code className="mt-3 block text-foreground text-sm">
          npx @ecentic/cli
        </code>
      </div>
      <ul className="grid min-w-0 grid-cols-2">
        {endpoints.map(({ path, title, icon: Icon }, index) => (
          <li
            key={path}
            className="relative min-w-0 border-accent-foreground border-b odd:border-r [&:nth-last-child(-n+2)]:border-b-0"
          >
            <a
              href={path}
              className="group flex h-full min-w-0 flex-col items-start gap-4 px-6 py-6 text-foreground transition-colors duration-150 hover:bg-primary/5 hover:text-primary-text focus-visible:bg-primary/5 focus-visible:outline-primary-text focus-visible:-outline-offset-2 max-sm:px-4"
            >
              <span className="flex w-full items-center justify-between gap-3">
                <Icon className="size-7 text-primary-text" aria-hidden />
                <ArrowRightIcon
                  className="size-4 -rotate-45 text-primary-text transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
              <span className="font-heading text-lg leading-tight">
                {title}
              </span>
              <code className="mt-auto w-full break-all text-foreground-dimmed text-xs">
                {path}
              </code>
            </a>
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            {index % 2 === 0 && (
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            )}
            {index >= 4 && (
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            )}
            {index === 4 && (
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            )}
          </li>
        ))}
      </ul>
      {note && (
        <p className="border-accent-foreground border-t px-7 py-6 text-foreground-dimmed text-sm max-sm:px-4">
          {note}
        </p>
      )}
    </div>
  );
};
