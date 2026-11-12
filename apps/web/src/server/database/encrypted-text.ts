import { customType } from "drizzle-orm/pg-core";
import {
  decryptCredential,
  encryptCredential,
} from "../utils/credential-encryption";

/** Keep Postgres text storage while encrypting every ORM write/read boundary. */
export const encryptedText = (name: string, purpose: string) =>
  customType<{ data: string; driverData: string }>({
    dataType: () => "text",
    toDriver: (value) => encryptCredential(value, purpose),
    fromDriver: (value) => decryptCredential(value, purpose),
  })(name);
