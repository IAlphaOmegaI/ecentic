import {
  createUploadthing,
  type FileRouter as GenericFileRouter,
} from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const builder = createUploadthing();

const api = new UTApi();

/**
 * Server-side upload using UTApi. Bypasses the file router callback flow
 * (which fails in dev due to self-fetch) and talks directly to UploadThing API.
 */
export const upload = async (files: File[]) => {
  const results = await api.uploadFiles(files);

  const failed = results.find((result) => result.error !== null);
  if (failed?.error) throw failed.error;

  return results
    .filter(
      (
        result,
      ): result is { data: NonNullable<typeof result.data>; error: null } =>
        result.data !== null,
    )
    .map((result) => ({ ufsUrl: result.data.url }));
};

export const fileRouter = {
  thumbnails: builder({})
    .onUploadError(async ({ error }) => {
      console.log({ error });
    })
    .onUploadComplete(async ({ file }) => {
      console.log({ file });
      return { url: file.ufsUrl };
    }),

  projects: builder({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 4,
    },
  })
    .onUploadError(async ({ error }) => {
      console.log({ error });
    })
    .onUploadComplete(async ({ file }) => {
      console.log({ file });
      return { url: file.ufsUrl };
    }),
} satisfies GenericFileRouter;

export type FileRouter = typeof fileRouter;
