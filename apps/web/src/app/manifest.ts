import { createWebManifest } from "@/lib/web-manifest";
import messages from "../../messages/en.json";

export default () =>
  createWebManifest(
    "en",
    messages.general.meta,
    messages.general.media.interfaceEnglish,
  );
