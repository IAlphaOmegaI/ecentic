import {
  createEnterpriseOgImage,
  enterpriseOgContentType,
  enterpriseOgSize,
} from "@/lib/enterprise-og";
import messages from "../../messages/fragments/enterpriseRecovery.en.json";

export const alt = "ecentic";
export const size = enterpriseOgSize;
export const contentType = enterpriseOgContentType;

export default () =>
  createEnterpriseOgImage({
    locale: "en",
    ...messages.enterpriseRecovery.og.home,
    signoff: messages.enterpriseRecovery.og.home.title,
  });
