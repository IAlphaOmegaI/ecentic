import type { PlopTypes } from "@turbo/gen";
import { transform } from "./transformer";

export const config: PlopTypes.PlopGeneratorConfig = {
  description: "Generate a new icon component from SVG",
  prompts: [
    {
      type: "input",
      name: "name",
      message: "What is the name of the icon?",
    },
    {
      type: "input",
      name: "svg",
      message: "Paste the SVG content here:",
    },
  ],
  actions: [
    {
      type: "add",
      path: "packages/shared/icons/src/icons/{{kebabCase name}}.tsx",
      templateFile: "icon/template.hbs",
      transform,
    },
    {
      type: "modify",
      path: "packages/shared/icons/src/index.ts",
      pattern: /(export type \* from "\.\/types";)/,
      template: 'export * from "./icons/{{kebabCase name}}";\n$1',
    },
  ],
};
