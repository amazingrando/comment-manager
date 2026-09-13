import { parseTokenEncryptionKey, sealSecret, unsealSecret } from "./seal";
import { serverEnv } from "@/lib/env";

function encryptionKey() {
  return parseTokenEncryptionKey(serverEnv().tokenEncryptionKey);
}

export function sealOAuthToken(plaintext: string): string {
  return sealSecret(plaintext, encryptionKey());
}

export function sealOAuthTokenOrNull(
  plaintext: string | null | undefined,
): string | null {
  if (plaintext == null || plaintext === "") return null;
  return sealOAuthToken(plaintext);
}

export function unsealOAuthToken(stored: string): string {
  return unsealSecret(stored, encryptionKey());
}

export function unsealOAuthTokenOrNull(
  stored: string | null | undefined,
): string | null {
  if (stored == null || stored === "") return null;
  return unsealOAuthToken(stored);
}
