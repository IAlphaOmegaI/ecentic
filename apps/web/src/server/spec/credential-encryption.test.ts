import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
  credentialKeyIdentifier,
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
} from "../utils/credential-encryption";

const settings = { key: randomBytes(32).toString("base64") };
const purpose = "store_account.consumerSecret";
const secret = "wc_secret_that_must_not_appear_in_errors";

describe("stored credential encryption", () => {
  test("encrypts every value with a fresh nonce and authenticates the original value", () => {
    const first = encryptCredential(secret, purpose, settings);
    const second = encryptCredential(secret, purpose, settings);
    expect(isEncryptedCredential(first)).toBe(true);
    expect(first).not.toContain(secret);
    expect(first).not.toBe(second);
    expect(decryptCredential(first, purpose, settings)).toBe(secret);
    expect(
      decryptCredential(
        encryptCredential("", purpose, settings),
        purpose,
        settings,
      ),
    ).toBe("");
  });
  test("rejects a substituted credential column and a wrong key", () => {
    const encrypted = encryptCredential(secret, purpose, settings);
    expect(() =>
      decryptCredential(encrypted, "account.accessToken", settings),
    ).toThrow("Stored credential could not be decrypted");
    expect(() =>
      decryptCredential(encrypted, purpose, {
        key: randomBytes(32).toString("base64"),
      }),
    ).toThrow("Stored credential could not be decrypted");
  });
  test("rejects tampering with the nonce, authentication tag and ciphertext", () => {
    const encrypted = encryptCredential(secret, purpose, settings);
    for (const index of [2, 3, 4]) {
      const parts = encrypted.split(":");
      const original = parts[index] ?? "";
      parts[index] = `${original[0] === "A" ? "B" : "A"}${original.slice(1)}`;
      expect(() =>
        decryptCredential(parts.join(":"), purpose, settings),
      ).toThrow("Stored credential could not be decrypted");
    }
  });
  test("key rotation reads old envelopes without weakening new writes", () => {
    const old = encryptCredential(secret, purpose, settings);
    const next = {
      key: randomBytes(32).toString("base64"),
      previousKeys: settings.key,
    };
    expect(decryptCredential(old, purpose, next)).toBe(secret);
    expect(encryptCredential(secret, purpose, next)).toContain(
      credentialKeyIdentifier(next),
    );
  });
  test("plaintext reads require an explicit migration exception; writes always require a strong key", () => {
    expect(() => decryptCredential(secret, purpose, settings)).toThrow(
      "Legacy credentials require the encryption migration",
    );
    expect(
      decryptCredential(secret, purpose, { ...settings, allowLegacy: true }),
    ).toBe(secret);
    expect(() =>
      decryptCredential("ecentic.enc.v2:unknown", purpose, {
        ...settings,
        allowLegacy: true,
      }),
    ).toThrow("Stored credential encryption version is unsupported");
    expect(() =>
      encryptCredential(secret, purpose, { allowLegacy: true }),
    ).toThrow("Credential encryption key is not configured correctly");
    expect(() => encryptCredential(secret, purpose, { key: "short" })).toThrow(
      "Credential encryption key is not configured correctly",
    );
  });
});
