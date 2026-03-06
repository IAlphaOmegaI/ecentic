import type { PlopTypes } from "@turbo/gen";
import { config as icon } from "./icon/config";

export default (plop: PlopTypes.NodePlopAPI) => {
  plop.setGenerator("icon", icon);
};
