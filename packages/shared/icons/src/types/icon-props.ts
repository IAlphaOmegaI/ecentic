import type { SVGProps } from "react";

export type IconProps = Readonly<
  SVGProps<SVGSVGElement> & {
    title?: string;
  }
>;
