import * as React from "react";

/**
 * FileUpload — from @zenncore/web@0.0.0.
 */
export interface FileUploadProps {
  children: React.ReactNode;
  accept?: Accept[];
  disabled?: boolean;
  className?: string;
  mode: "multiple" | "single";
  value?: File | File[];
  onValueChange?: ((value: File[]) => void) | ((value: File | null) => void);
}

export declare const FileUpload: React.ComponentType<FileUploadProps>;
