import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { openApiDocument } from "@/lib/agent-discovery";
import { ApiDefinition } from "./_components/api-definition";
import "./_components/api-reference.css";

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
      content={content}
      path="/docs/api"
      heroChildren={
        <dl className="api-reference-facts">
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
              className="api-reference-index"
              aria-label={content.navigation}
            >
              {operations.map(({ path, method, operation }) => (
                <a
                  key={operation.operationId}
                  href={`#${operation.operationId}`}
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
                className="api-reference-operation"
              >
                <div className="marketing-cell">
                  <p className="api-reference-method">
                    <code>{method.toUpperCase()}</code>
                    <code>{path}</code>
                  </p>
                  <h3>{content.operationNames[operation.operationId]}</h3>
                  <p className="marketing-note">
                    {content.operation}: <code>{operation.operationId}</code>
                  </p>
                  <ApiDefinition label={content.definition} value={operation} />
                </div>
              </article>
            ))}
          </>
        ),
        "api-schemas": (
          <div className="api-reference-schemas">
            {Object.entries(openApiDocument.components.schemas).map(
              ([name, schema]) => (
                <article
                  key={name}
                  id={`schema-${name}`}
                  className="marketing-cell"
                >
                  <h3>
                    <code>{name}</code>
                  </h3>
                  <ApiDefinition label={content.definition} value={schema} />
                </article>
              ),
            )}
          </div>
        ),
        "api-auth": (
          <div className="marketing-cell">
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
