import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { FileRouter } from "@/server/app/storage";

export const UploadButton = generateUploadButton<FileRouter>();
export const UploadDropzone = generateUploadDropzone<FileRouter>();

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<FileRouter>();
