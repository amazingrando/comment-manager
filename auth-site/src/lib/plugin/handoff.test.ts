import { afterEach, describe, expect, it } from "vitest";
import {
  createHandoff,
  newHandoffKeys,
  readHandoff,
  resetHandoffsForTests,
  writeHandoffPayload,
} from "./handoff";

const session = {
  access_token: "figu_access",
  refresh_token: "figu_refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "123", handle: "randy", email: "randy@example.com" },
};

afterEach(() => {
  resetHandoffsForTests();
});

describe("plugin oauth handoff", () => {
  it("returns pending until the callback writes a payload", () => {
    const { readKey, writeKey } = newHandoffKeys();
    createHandoff(readKey, writeKey);
    expect(readHandoff(readKey)).toEqual({ status: "pending" });
    writeHandoffPayload(writeKey, session);
    expect(readHandoff(readKey)).toEqual({ status: "ready", payload: session });
    expect(readHandoff(readKey)).toEqual({ status: "missing" });
  });

  it("rejects an unknown write key", () => {
    const { readKey, writeKey } = newHandoffKeys();
    createHandoff(readKey, writeKey);
    expect(() => writeHandoffPayload("nope", session)).toThrow(
      /expired or was not found/,
    );
  });
});
