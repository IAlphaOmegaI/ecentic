import { type ClassValue, cn } from "@zenncore/utils";
import type { State } from "../types/component-state";

//TODO: Move to @zenncore/utils

type ClassName =
  // biome-ignore lint/suspicious/noExplicitAny: cn parameter includes Record<string, any>(ClassDictionary)
  | Exclude<ClassValue, Record<string, any>>
  | Record<string, boolean>
  | ClassName[];
type ClassNameFunction<S = State> = (state: S) => string;

/**
 * If the provided className is a string, it will be returned as is.
 * Otherwise, the function will call the className function with the state as the first argument.
 *
 * @param className
 * @param state
 */
export const resolveClassName = <C extends ClassName, S = State>(
  className: C | ((state: S) => C),
  state: S,
): C => {
  return typeof className === "function" ? className(state) : className;
};

const isClassNameFunction = <S extends State>(
  className: ClassName | ClassNameFunction<S>,
  state: S,
): className is (state: S) => string => {
  if (typeof className !== "function") return false;
  if (className.length !== 1) return false;

  try {
    const result = className(state);
    return typeof result === "string";
  } catch {
    return false;
  }
};

const fn: ClassValue = () => "";
const _test = isClassNameFunction(fn, {
  disabled: true,
})
  ? fn
  : false;

/**
 * Creates a class name string or a function that returns a class name string
 * based on the provided class names and the component state.
 *
 * If all provided class names are not class name functions,
 * the function returns a single merged class name string.
 * If any of the provided class names are functions that depend on the state,
 * the function returns a new function that takes the state as an argument
 * and returns the concatenated class name string.
 *  * @param classNames - An array of class names or functions that return class names.
 */
export const createClassName = <T extends State>(
  ...classNames: (ClassName | ((state: T) => string | undefined))[]
): string | ((state: T) => string) => {
  const hasFunctionClassNames = classNames.some(
    (className) => typeof className === "function",
  );

  if (!hasFunctionClassNames) return cn(...classNames);

  return (state: T) =>
    cn(...classNames.map((className) => resolveClassName(className, state)));
};
