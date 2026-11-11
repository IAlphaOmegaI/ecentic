import { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { openApiDocument } from "@/lib/agent-discovery";
import { ApiDefinition } from "./_components/api-definition";
import { ApiReference } from "./_components/api-reference";

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
const schemas = Object.entries(openApiDocument.components.schemas);

const schemaReferences = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === "$ref" && typeof child === "string"
      ? [child.replace("#/components/schemas/", "")]
      : schemaReferences(child),
  );
};

export const generateMetadata = async () => {
  const { enterpriseRecovery } = await getMessages();
  return marketingMetadata(enterpriseRecovery.api.meta, "/docs/api");
};

export default async () => {
  const { enterpriseRecovery, docsApiPage: copy } = await getMessages();
  const content = enterpriseRecovery.api;
  return (
    <MarketingPage
      darkHero={false}
      content={content}
      path="/docs/api"
      heroChildren={
        <>
          <dl className="[&_dd]:wrap-anywhere mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-accent-foreground border-t pt-6 lg:grid-cols-[1fr_1fr_2fr] [&_dd]:mt-2 [&_dt]:text-foreground-dimmed [&_dt]:text-sm">
            <div>
              <dt>{content.version}</dt>
              <dd>{openApiDocument.info.version}</dd>
            </div>
            <div>
              <dt>{content.specification}</dt>
              <dd>{openApiDocument.openapi}</dd>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <dt>{content.server}</dt>
              <dd className="text-sm">
                <code>{openApiDocument.servers[0].url}</code>
              </dd>
            </div>
          </dl>
          <nav
            aria-label={copy.navigation}
            className="mt-8 flex flex-wrap gap-x-8 gap-y-4"
          >
            {content.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-primary-text text-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary-text"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </>
      }
      sectionChildren={{
        "api-reference": (
          <ApiReference
            copy={copy}
            groups={[
              { id: "all", label: copy.all },
              ...openApiDocument.tags.map((tag) => ({
                id: tag.name,
                label: copy.groups[tag.name],
              })),
            ]}
            rail={
              <div>
                <div className="h-32 text-foreground-dimmed">
                  <EvolvingAscii artwork="console" />
                </div>
                <p className="mt-4 text-foreground text-lg">
                  {copy.sourceTitle}
                </p>
                <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                  {copy.sourceBody}
                </p>
                <p className="mt-6 break-words font-mono text-foreground-dimmed text-xs leading-loose">
                  operationId → parameters
                  <br />
                  requestBody → responses
                  <br />
                  $ref → components.schemas
                </p>
              </div>
            }
            entries={operations.map(({ path, method, operation }) => ({
              id: operation.operationId,
              label: content.operationNames[operation.operationId],
              path,
              method,
              groups: operation.tags,
              detail: (
                <>
                  <dl className="grid grid-cols-1 gap-4 border-accent-foreground border-t pt-4 sm:grid-cols-2 [&_dd]:mt-2 [&_dt]:text-foreground-dimmed [&_dt]:text-sm">
                    <div>
                      <dt>{content.operation}</dt>
                      <dd className="wrap-anywhere font-mono text-foreground text-xs">
                        {operation.operationId}
                      </dd>
                    </div>
                    <div>
                      <dt>{copy.responses}</dt>
                      <dd className="font-mono text-foreground text-xs">
                        {Object.keys(operation.responses).join(" · ")}
                      </dd>
                    </div>
                  </dl>
                  <SchemaLinks value={operation} label={copy.references} />
                  <ApiDefinition label={copy.definition} value={operation} />
                </>
              ),
            }))}
          />
        ),
        "api-schemas": (
          <ApiReference
            copy={copy}
            rail={
              <div className="lg:sticky lg:top-30">
                <p className="text-4xl text-primary-text tabular-nums">
                  {schemas.length}
                </p>
                <p className="mt-2 text-foreground">{copy.schemas}</p>
                <p className="mt-6 text-foreground-dimmed text-sm leading-relaxed">
                  {copy.schemaBody}
                </p>
              </div>
            }
            entries={schemas.map(([name, schema]) => ({
              id: `schema-${name}`,
              label: name,
              detail: (
                <>
                  <SchemaLinks value={schema} label={copy.references} />
                  <ApiDefinition label={copy.definition} value={schema} />
                </>
              ),
            }))}
          />
        ),
        "api-auth": (
          <div className="grid grid-cols-1 border-accent-foreground border-t lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="border-accent-foreground border-b bg-background-dimmed p-6 max-sm:p-4 lg:border-r lg:border-b-0">
              <p className="text-foreground text-lg">{copy.securityTitle}</p>
              <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                {copy.securityBody}
              </p>
            </div>
            <div className="min-w-0 p-6 max-sm:p-4">
              <ApiDefinition
                label={copy.definition}
                value={openApiDocument.components.securitySchemes}
              />
            </div>
          </div>
        ),
      }}
    />
  );
};

const SchemaLinks = ({ value, label }: { value: unknown; label: string }) => {
  const references = [...new Set(schemaReferences(value))].filter((name) =>
    schemas.some(([schema]) => schema === name),
  );
  if (!references.length) return null;
  return (
    <nav aria-label={label}>
      <p className="text-foreground-dimmed text-sm">{label}</p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {references.map((name) => (
          <a
            key={name}
            href={`#schema-${name}`}
            className="wrap-anywhere font-mono text-primary-text text-xs underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary-text"
          >
            {name}
          </a>
        ))}
      </div>
    </nav>
  );
};
