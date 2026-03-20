"use client";

import { FileIcon, UploadIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import {
  createContext,
  useControlled,
  useStableCallback,
} from "@zenncore/utils/hooks";
import type { EmptyObject } from "@zenncore/utils/types";
import {
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RenderComponentProps } from "../utils/types/render-component-props";
import { ScrollArea } from "./scroll-area";

export type Accept =
  | "audio/*"
  | "image/*"
  | "video/*"
  | "text/plain"
  | "text/csv"
  | "application/pdf"
  | "application/json"
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "video/mp4"
  | "video/webm"
  | "audio/mpeg"
  | "audio/wav"
  | ".pdf"
  | ".csv"
  | ".doc"
  | ".docx"
  | ".png"
  | ".jpeg"
  | ".jpg"
  | ".mp4"
  | ".mp3"
  | ".zip";

type FileUploadContext = { accept?: Accept[]; disabled?: boolean } & (
  | {
      mode: "multiple";
      value: File[] | null;
      max?: number;
      setValue: (value: File[]) => void;
    }
  | {
      mode: "single";
      value: File | null;
      setValue: (value: File | null) => void;
    }
);

const [FileUploadContext, useFileUpload] = createContext<FileUploadContext>({
  name: "FileUpload",
});

//TODO: implement useRender in FileUpload components
//TODO: make components more composable

export const FileUpload = (props: FileUpload.Props): JSX.Element => {
  const [value, setValue] = useControlled({
    controlled: props.value,
    default: null,
    name: "FileUpload",
  });

  const disabled =
    (props.disabled ?? false) ||
    (props.mode === "single" && (value as File | null) !== null) ||
    (props.mode === "multiple" &&
      (value as File[] | null)?.length === props.max);

  const handleValueChange = useStableCallback((updatedValue: File | File[]) => {
    console.log("setting value to ", updatedValue);

    setValue(updatedValue);
    // @ts-expect-error - updatedValue type is correctly handled by discriminated union at runtime
    props.onValueChange?.(updatedValue);
  });

  // @ts-expect-error - context properties correctly match discriminated union at runtime based on props.mode
  const context: FileUploadContext = useMemo(
    () => ({
      mode: props.mode,
      value: value,
      accept: props.accept,
      disabled,
      setValue: handleValueChange,
    }),
    [props.mode, props.accept, value, disabled, handleValueChange],
  );

  return (
    <FileUploadContext value={context}>{props.children}</FileUploadContext>
  );
};
export namespace FileUpload {
  export type Props = {
    children: ReactNode;
    accept?: Accept[];
    disabled?: boolean;
    className?: string;
  } & (
    | {
        mode: "multiple";
        value?: File[] | null;
        max?: number;
        onValueChange?: (value: File[]) => void;
      }
    | {
        mode: "single";
        value?: File | null;
        onValueChange?: (value: File | null) => void;
      }
  );
}

export const FileUploadInput = ({
  // render,
  className,
  classList,
  // ...props
}: FileUploadInput.Props): JSX.Element => {
  const { mode, value, setValue, accept, disabled } = useFileUpload();

  const selectedFile = mode === "single" ? (value as File | null) : null;

  const ref = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleValueChange = (files: FileList | null) => {
    if (!files) return;

    const list = Array.from(files);

    switch (mode) {
      case "multiple":
        setValue(list);
        break;
      case "single":
        setValue(list[0] ?? null);
        break;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleValueChange(e.target.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (disabled) return;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom)
      setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;

    handleValueChange(files);
  };

  // const element = useRender({
  //   defaultTagName: "div",
  //   props: mergeProps<"div">(props, {
  //     className: cn(
  //       "relative rounded-lg border border-accent-foreground p-2",
  //       className,
  //       classList?.root,
  //     ),
  //     onDragEnter: handleDragEnter,
  //     onDragLeave: handleDragLeave,
  //     onDragOver: handleDragOver,
  //     onDrop: handleDrop,
  //   }),
  // });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: needed to handle drag and drop
    <div
      className={cn(
        "relative border border-accent-foreground p-2",
        className,
        classList?.root,
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={ref}
        type="file"
        multiple={mode === "multiple"}
        accept={accept?.join(",")}
        disabled={disabled}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled && !selectedFile}
        className={cn(
          "h-32 w-full origin-center flex-col items-center justify-center border border-dashed transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          isDragging
            ? "scale-95 border-primary bg-primary/10"
            : "border-accent-foreground",
          classList?.input,
        )}
        onClick={() => !selectedFile && ref.current?.click()}
      >
        {selectedFile ? (
          <span className="flex flex-col items-center gap-2">
            <FileIcon className="size-12 text-foreground-dimmed" />
            <span className="max-w-[90%] truncate text-foreground text-sm">
              {selectedFile.name}
            </span>
          </span>
        ) : (
          <span
            className={cn(
              "flex flex-col items-center gap-2 transition-colors duration-300",
              isDragging ? "text-primary" : "text-foreground-dimmed",
            )}
          >
            <UploadIcon className="size-12" />
            <span className="text-sm leading-4">
              Select files <br /> or drag and drop
            </span>
          </span>
        )}
      </button>
    </div>
  );
};
export namespace FileUploadInput {
  export type ClassListKey = "root" | "input";
  export type Props = RenderComponentProps<
    "div",
    EmptyObject,
    {
      classList?: ClassList<ClassListKey>;
    }
  >;
}

export const FileUploadPreview = (): JSX.Element | null => {
  const { value, mode } = useFileUpload();

  if (mode === "single") return null;

  const files = value as File[] | null;
  const items = files?.filter((file) => file !== null);

  return (
    <ScrollArea
      className="mt-2 flex h-12 w-full items-center gap-2"
      classList={{
        viewport: "flex items-center gap-2",
      }}
    >
      {items?.map((file, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: no better key to use
          key={index}
          className="flex h-full items-center gap-1 border border-accent-foreground py-0.5 pr-2"
        >
          <FileIcon className="size-10" />
          <div className="flex flex-col">
            <h6 className="whitespace-nowrap text-sm">{file.name}</h6>
            <span className="max-w-38 truncate whitespace-nowrap text-foreground-dimmed text-sm text-xs">
              {file.type}
            </span>
          </div>
        </div>
      ))}
    </ScrollArea>
  );
};

const _getFileIcon = (type: string): JSX.Element => {
  switch (type) {
    // case "image/png":
    //   return <DocumentPngIcon className="size-4" />;
    // case "image/jpg":
    // case "image/jpeg":
    //   return <DocumentJpgIcon className="size-4" />;
    // case "image/gif":
    //   return <PhotoIcon className="size-4" />;
    // case "application/pdf":
    //   return <DocumentPdfIcon className="size-4" />;
    // case "application/doc":
    // case "application/docx":
    //   return <DocumentDocxIcon className="size-4" />;
    default:
      return <FileIcon className="size-4" />;
  }
};
