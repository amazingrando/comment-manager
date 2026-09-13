import { describe, expect, it } from "vitest";
import {
  isSealedSecret,
  parseTokenEncryptionKey,
  sealSecret,
  unsealSecret,
} from "./seal";

const KEY = parseTokenEncryptionKey(
  "079cb00742fdaccaa85ec71ed1139131e0d84208f3814da95a10fc18770fd970",
);

describe("sealSecret / unsealSecret", () => {
  it("round-trips a token", () => {
    const sealed = sealSecret("figu_access_token_value", KEY);
    expect(isSealedSecret(sealed)).toBe(true);
    expect(unsealSecret(sealed, KEY)).toBe("figu_access_token_value");
  });

  it("returns legacy plaintext without a prefix", () => {
    expect(unsealSecret("plain-legacy-token", KEY)).toBe("plain-legacy-token");
  });

  it("rejects a wrong key", () => {
    const sealed = sealSecret("secret", KEY);
    const other = parseTokenEncryptionKey(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(() => unsealSecret(sealed, other)).toThrow();
  });
});
