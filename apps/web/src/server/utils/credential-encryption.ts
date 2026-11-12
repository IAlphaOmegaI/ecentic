import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PREFIX = "ecentic.enc.v1:";

type Configuration = {
  key?: string;
  previousKeys?: string;
  allowLegacy?: boolean;
};

const configuration = (): Configuration => ({
  key: process.env.CREDENTIAL_ENCRYPTION_KEY,
  previousKeys: process.env.CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS,
  allowLegacy: process.env.CREDENTIAL_ENCRYPTION_ALLOW_LEGACY === "1",
});

const decodeKey = (value: string | undefined) => {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new Error("Credential encryption key is not configured correctly");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error("Credential encryption key is not configured correctly");
  return key;
};

const keyIdentifier = (key: Buffer) =>
  createHash("sha256").update(key).digest("hex").slice(0, 16);

export const isEncryptedCredential = (value: string) =>
  value.startsWith(PREFIX);

/** AES-256-GCM; fresh 96-bit nonce and column identity as authenticated data. */
export const encryptCredential = (
  value: string,
  purpose: string,
  settings: Configuration = configuration(),
) => {
  const key = decodeKey(settings.key);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(purpose));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return `${PREFIX}${keyIdentifier(key)}:${nonce.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
};

export const decryptCredential = (
  value: string,
  purpose: string,
  settings: Configuration = configuration(),
) => {
  if (!isEncryptedCredential(value)) {
    if (value.startsWith("ecentic.enc."))
      throw new Error("Stored credential encryption version is unsupported");
    if (settings.allowLegacy) return value;
    throw new Error("Legacy credentials require the encryption migration");
  }

  const parts = value.slice(PREFIX.length).split(":");
  const [identifier, encodedNonce, encodedTag, encodedCiphertext] = parts;
  if (
    parts.length !== 4 ||
    !identifier ||
    !/^[a-f0-9]{16}$/.test(identifier) ||
    !encodedNonce ||
    !encodedTag ||
    encodedCiphertext === undefined ||
    !parts.every((part) => /^[A-Za-z0-9_-]*$/.test(part))
  )
    throw new Error("Stored credential could not be decrypted");

  const keys = [settings.key, ...(settings.previousKeys?.split(",") ?? [])]
    .filter((key): key is string => Boolean(key))
    .map(decodeKey);
  const key = keys.find((candidate) => keyIdentifier(candidate) === identifier);
  const nonce = Buffer.from(encodedNonce, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  if (
    !key ||
    nonce.length !== 12 ||
    tag.length !== 16 ||
    nonce.toString("base64url") !== encodedNonce ||
    tag.toString("base64url") !== encodedTag ||
    ciphertext.toString("base64url") !== encodedCiphertext
  )
    throw new Error("Stored credential could not be decrypted");

  // Never attach the input, key, or underlying crypto error to telemetry.
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Stored credential could not be decrypted");
  }
};

export const credentialKeyIdentifier = (
  settings: Configuration = configuration(),
) => keyIdentifier(decodeKey(settings.key));
