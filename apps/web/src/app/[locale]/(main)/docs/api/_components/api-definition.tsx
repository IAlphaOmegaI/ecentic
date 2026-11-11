import { DocsCode } from "../../_components/docs";

export const ApiDefinition = ({ label, value }: ApiDefinition.Props) => (
  <div className="min-w-0 [&_[data-id$=-viewport]]:max-h-128">
    <DocsCode label={label}>{JSON.stringify(value, null, 2)}</DocsCode>
  </div>
);

export namespace ApiDefinition {
  export type Props = { label: string; value: unknown };
}
