"use client";

import {
  Children,
  type ComponentType,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Tuple } from "../types";

const identifySlot = <Identifier extends string | ComponentType>(
  identifier: Identifier,
  child: ReactElement,
) => {
  return typeof identifier === "string"
    ? // @ts-expect-error: needed for the type to be valid
      child.type.displayName === `Slot:${identifier}`
    : child.type === identifier;
};

export const useSlot = <Identifier extends string | ComponentType>(
  children: ReactNode,
  identifier: Identifier,
): ReactNode | null => {
  const childrens = Children.toArray(children);

  const slot = childrens.find((child) => {
    console.log("child hello", child);
    if (isValidElement(child)) return identifySlot(identifier, child);
    return false;
  });

  return slot ?? null;
};

export const useSlots = <Identifiers extends (string | ComponentType)[]>(
  children: ReactNode,
  identifiers: Identifiers,
) => {
  const childrens = Children.toArray(children);

  const slots = identifiers.map((identifier) => {
    return (
      childrens.find((child) => {
        if (isValidElement(child)) return identifySlot(identifier, child);
        return false;
      }) ?? null
    );
  });

  return slots as Tuple<ReactNode | null, Identifiers["length"]>;
};

export const createSlot = <Name extends string>(
  name: Name,
): ComponentType<PropsWithChildren> => {
  const Slot = ({ children }: PropsWithChildren) => <>{children}</>;

  Slot.displayName = `Slot:${name}`;

  return Slot;
};
