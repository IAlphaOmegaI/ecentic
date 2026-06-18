export type GenericProps = {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
};

export type RefinedProps<Value> = {
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value) => void;
};
