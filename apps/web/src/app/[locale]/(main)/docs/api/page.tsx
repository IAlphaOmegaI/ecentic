import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { openApiDocument } from "@/lib/agent-discovery";
import { ApiDefinition } from "./_components/api-definition";

const operations = Object.entries(openApiDocument.paths).flatMap(
  ([path, methods]) => [
    ...("get" in methods
      ? [{ path, method: "GET", operation: methods.get }]
      : []),
    ...("post" in methods
      ? [{ path, method: "POST", operation: methods.post }]
      : []),
    ...("delete" in methods
      ? [{ path, method: "DELETE", operation: methods.delete }]
      : []),
  ],
);

export const generateMetadata = async () => {
  const { enterpriseRecovery } = await getMessages();
  return marketingMetadata(enterpriseRecovery.api.meta, "/docs/api");
};

export default async () => {
  const { enterpriseRecovery } = await getMessages();
  const content = enterpriseRecovery.api;
  return (
    <MarketingPage
      darkHero={false}
      content={content}
      path="/docs/api"
      heroChildren={
        <dl className="[&_dd]:wrap-anywhere mt-12 flex flex-wrap gap-8 border-accent-foreground border-t pt-6 [&_dd]:mt-2 [&_dt]:text-[13px] [&_dt]:text-foreground-dimmed">
          <div>
            <dt>{content.version}</dt>
            <dd>{openApiDocument.info.version}</dd>
          </div>
          <div>
            <dt>{content.specification}</dt>
            <dd>{openApiDocument.openapi}</dd>
          </div>
          <div>
            <dt>{content.server}</dt>
            <dd>
              <code>{openApiDocument.servers[0].url}</code>
            </dd>
          </div>
        </dl>
      }
      sectionChildren={{
        "api-reference": (
          <>
            <nav
              className="grid grid-cols-1 min-[761px]:grid-cols-2"
              aria-label={content.navigation}
            >
              {operations.map(({ path, method, operation }) => (
                <a
                  key={operation.operationId}
                  href={`#${operation.operationId}`}
                  className="[&_code]:wrap-anywhere grid grid-cols-[68px_minmax(0,1fr)] gap-x-4 gap-y-2 border-accent-foreground border-t px-5 py-6 text-primary-text hover:bg-background-dimmed min-[761px]:px-7 min-[761px]:odd:border-r [&_code]:text-[13px] [&_span]:col-start-2 [&_span]:text-foreground [&_span]:text-sm"
                >
                  <code>{method.toUpperCase()}</code>
                  <code>{path}</code>
                  <span>{content.operationNames[operation.operationId]}</span>
                </a>
              ))}
            </nav>
            {operations.map(({ path, method, operation }) => (
              <article
                key={operation.operationId}
                id={operation.operationId}
                className="scroll-mt-24 border-accent-foreground border-t"
              >
                <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]">
                  <p className="wrap-anywhere mb-6 flex gap-6 text-primary-text text-sm">
                    <code>{method.toUpperCase()}</code>
                    <code>{path}</code>
                  </p>
                  <h3>{content.operationNames[operation.operationId]}</h3>
                  <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
                    {content.operation}: <code>{operation.operationId}</code>
                  </p>
                  <ApiDefinition label={content.definition} value={operation} />
                </div>
              </article>
            ))}
          </>
        ),
        "api-schemas": (
          <div className="grid grid-cols-1 min-[761px]:grid-cols-2">
            {Object.entries(openApiDocument.components.schemas).map(
              ([name, schema]) => (
                <article
                  key={name}
                  id={`schema-${name}`}
                  className="marketing-cell relative min-w-0 scroll-mt-24 border-accent-foreground border-t px-7 py-14 max-sm:px-4 max-sm:py-10 min-[761px]:odd:border-r [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]"
                >
                  <h3 className="wrap-anywhere text-xl">
                    <code>{name}</code>
                  </h3>
                  <ApiDefinition label={content.definition} value={schema} />
                </article>
              ),
            )}
          </div>
        ),
        "api-auth": (
          <div className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-6 [&>h3+p]:mt-6 [&>p]:max-w-[70ch]">
            <ApiDefinition
              label={content.definition}
              value={openApiDocument.components.securitySchemes}
            />
          </div>
        ),
      }}
    />
  );
};
