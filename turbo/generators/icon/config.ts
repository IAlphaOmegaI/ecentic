import type { PlopTypes } from "@turbo/gen";
import { transform } from "./transformer";

//TODO: export the generated files in the index.ts

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
      path: "packages/shared/icons/src/{{kebabCase name}}.tsx",
      templateFile: "icon/template.hbs",
      transform,
    },
  ],
};
