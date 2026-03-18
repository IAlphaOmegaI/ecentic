import {
  createUploadthing,
  type FileRouter as GenericFileRouter,
} from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

const utapi = new UTApi();

/**
 * Server-side upload using UTApi. Bypasses the file router callback flow
 * (which fails in dev due to self-fetch) and talks directly to UploadThing API.
 */
export const upload = async (files: File[]) => {
  const results = await utapi.uploadFiles(files);

  const failed = results.find((r) => r.error !== null);
  if (failed?.error) throw failed.error;

  return results
    .filter(
      (r): r is { data: NonNullable<typeof r.data>; error: null } =>
        r.data !== null,
    )
    .map((r) => ({ ufsUrl: r.data.url }));
};

export const fileRouter = {
  thumbnails: f({})
    .onUploadError(async ({ error }) => {
      console.log({ error });
    })
    .onUploadComplete(async ({ file }) => {
      console.log({ file });
      return { url: file.ufsUrl };
    }),

  projects: f({
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
