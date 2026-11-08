import { describe, expect, it } from "vitest";
import { getInstagramServerClient } from "../../apps/demo/lib/instagram.js";

describe("@instaconnect/demo - Server Client Integration", () => {
  it("initializes the demo server InstagramClient singleton cleanly", () => {
    const client = getInstagramServerClient();
    const metadata = client.getClientMetadata();
    expect(metadata.apiVersion).toBe("v21.0");
    expect(metadata.redirectUri).toContain("/api/instagram/callback");
  });
});

