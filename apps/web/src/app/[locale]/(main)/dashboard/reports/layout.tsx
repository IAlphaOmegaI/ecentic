import type { PropsWithChildren } from "react";
import { AccountWorkspace } from "../_components/account-workspace";

export default ({ children }: PropsWithChildren) => (
  <AccountWorkspace>{children}</AccountWorkspace>
);
