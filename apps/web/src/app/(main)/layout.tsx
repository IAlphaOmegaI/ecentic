import type { PropsWithChildren } from "react";
import { SmoothScroll } from "./_components/smooth-scroll";

export default ({ children }: PropsWithChildren) => (
  <SmoothScroll>{children}</SmoothScroll>
);
