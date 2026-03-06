import type { EmptyObject } from "@zenncore/utils/types";
import type { core } from "zod";
import type { CustomField } from "./field";

export type InterfaceValue<
  FieldValidator extends core.$ZodType,
  FieldProps extends EmptyObject,
> = {
  validator: FieldValidator;
  props: FieldProps;
};

export type GenericInterface = Record<
  string,
  InterfaceValue<core.$ZodType, EmptyObject>
>;

export type CompleteInterface<Interface extends GenericInterface> =
  Interface & {
    custom: {
      validator: CustomField["Validator"];
      props: CustomField["Props"];
    };
  };
