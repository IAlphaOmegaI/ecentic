import { describe, expect, test } from "bun:test";
import { Children, isValidElement, type ReactNode } from "react";
import { z } from "zod";
import { FieldController } from "../src/components/form";
import {
  field,
  type GenericField,
  InferredFormField,
} from "../src/components/inferred-form";
import { InputOTP, InputOTPGroup } from "../src/components/otp-input";
import { TextField } from "../src/components/text-field";

type ElementProps = {
  render?: unknown;
  maxLength?: number;
  children?: ReactNode;
  label?: unknown;
  validator?: unknown;
  description?: unknown;
  name?: string;
};

// Inspect the field renderer's element contract without mounting a DOM or
// replacing shared modules. Hook execution belongs to the controller itself.
const render = (config: GenericField) => {
  const controller = InferredFormField({ name: "code", ...config });
  if (
    !isValidElement<{
      render: (context: { field: Record<string, unknown> }) => ReactNode;
    }>(controller) ||
    controller.type !== FieldController
  )
    throw new Error("Expected a field controller");

  const field = controller.props.render({
    field: {
      name: "code",
      value: "123456",
      disabled: false,
      ref: () => undefined,
      onChange: () => undefined,
      onBlur: () => undefined,
    },
  });
  if (!isValidElement<{ children: ReactNode }>(field))
    throw new Error("Expected a rendered field");

  return Children.toArray(field.props.children).filter(
    isValidElement<ElementProps>,
  );
};

describe("inferred fields", () => {
  test("supplies standard OTP slots when no renderer is provided", () => {
    const elements = render(
      field({ shape: "otp", validator: z.string(), maxLength: 6 }),
    );
    const input = elements.find((element) => element.type === InputOTP);
    expect(input?.props.render).toBeUndefined();
    expect(input?.props.maxLength).toBe(6);
    const group = input?.props.children;
    expect(isValidElement(group) && group.type).toBe(InputOTPGroup);
  });

  test("passes a custom OTP renderer without competing default children", () => {
    const custom = () => <span>Custom slots</span>;
    const elements = render(
      field({
        shape: "otp",
        validator: z.string(),
        maxLength: 6,
        render: custom,
      }),
    );
    const input = elements.find((element) => element.type === InputOTP);
    expect(input?.props.render).toBe(custom);
    expect(input?.props.children).toBeUndefined();
  });

  test("keeps field metadata outside the text control", () => {
    const elements = render(
      field({
        shape: "text",
        validator: z.string().min(1),
        label: ({ isFieldRequired, name }) => (
          <span>{`${name}:${isFieldRequired}`}</span>
        ),
        description: "Confirmation code",
      }),
    );
    const input = elements.find((element) => element.type === TextField);
    expect(input?.props.label).toBeUndefined();
    expect(input?.props.validator).toBeUndefined();
    expect(input?.props.description).toBeUndefined();
    expect(input?.props.name).toBe("code");
    expect(elements[0]?.props.children).toBe("code:true");
  });
});
