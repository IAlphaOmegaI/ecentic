import * as React from "react";

/**
 * InputOTP — from @zenncore/web@0.0.0.
 */
export interface InputOTPProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  value?: string;
  maxLength: number;
  textAlign?: "center" | "left" | "right";
  pushPasswordManagerStrategy?: "none" | "increase-width";
  pasteTransformer?: (pasted: string) => string;
  containerClassName?: string;
  noScriptCSSFallback?: string;
  render?: (props: RenderProps) => React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  classList?: { root?: string; input?: string };
  onValueChange: (value: string) => void;
}

export declare const InputOTP: React.ComponentType<InputOTPProps>;
