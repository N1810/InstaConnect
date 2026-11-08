import { describe, expect, it, vi } from "vitest";
import {
  InstagramAuthError,
  InstagramClient,
  InstagramValidationError,
  OAuthStateManager,
  TokenManager
} from "@instaconnect/core";

describe("@instaconnect/core - OAuth, State & Token Management", () => {
  it("validates InstagramClient configuration strictly", () => {
    expect(
      () =>
        new InstagramClient({
          appId: "",
          appSecret: "secret",
          redirectUri: "https://example.com/callback"
        })
    ).toThrow(InstagramValidationError);

    expect(
      () =>
        new InstagramClient({
          appId: "123",
          appSecret: "secret",
          redirectUri: "http://example.com/insecure-non-localhost"
        })
    ).toThrow(InstagramValidationError);
  });

  it("generates a valid Meta Instagram OAuth authorization URL", () => {
    const client = new InstagramClient({
      appId: "app_999",
      appSecret: "sec_999",
      redirectUri: "https://app.example.com/api/instagram/callback"
    });

    const urlStr = client.auth.getAuthorizationUrl({
      state: "custom_csrf_state_123",
      scopes: ["instagram_business_basic", "instagram_business_manage_insights"]
    });

    const parsed = new URL(urlStr);
    expect(parsed.origin).toBe("https://www.instagram.com");
    expect(parsed.pathname).toBe("/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("app_999");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/instagram/callback"
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBe("custom_csrf_state_123");
    expect(parsed.searchParams.get("scope")).toBe(
      "instagram_business_basic,instagram_business_manage_insights"
    );
  });

  it("generates and validates HMAC-signed CSRF state tokens and rejects tampering", () => {
    const stateManager = new OAuthStateManager({
      secret: "super_secret_32_byte_test_key_value",
      maxAgeSeconds: 600
    });

    const state = stateManager.generateState({ accountId: "tenant_42" });
    const verified = stateManager.validateState(state, state);
    expect(verified?.metadata?.accountId).toBe("tenant_42");

    // Rejects mismatched state
    expect(() => stateManager.validateState(state, "different_state")).toThrow(InstagramAuthError);

    // Rejects tampered signature
    const [payload] = state.split(".");
    expect(() => stateManager.validateState(`${payload}.tampered_sig`)).toThrow(InstagramAuthError);
  });

  it("exchanges code for short-lived token and upgrades to 60-day long-lived token", async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oauth/access_token")) {
        return new Response(
          JSON.stringify({
            access_token: "IGQ_SHORT_TOKEN_12345678901234567890",
            user_id: "17841400000001",
            permissions: ["instagram_business_basic"]
          }),
          { status: 200 }
        );
      }
      if (url.includes("/access_token") && url.includes("ig_exchange_token")) {
        return new Response(
          JSON.stringify({
            access_token: "IGQ_LONG_LIVED_TOKEN_12345678901234567890",
            token_type: "bearer",
            expires_in: 5184000
          }),
          { status: 200 }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const client = new InstagramClient({
      appId: "app_123",
      appSecret: "secret_123",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const tokenRecord = await client.auth.handleCallback({
      code: "auth_code_xyz#_",
      state: "valid_state",
      expectedState: "valid_state"
    });

    expect(tokenRecord.tokenType).toBe("long_lived");
    expect(tokenRecord.userId).toBe("17841400000001");
    expect(tokenRecord.accessToken).toBe("IGQ_LONG_LIVED_TOKEN_12345678901234567890");

    const stored = await client.tokens.getToken("17841400000001");
    expect(stored?.accessToken).toBe("IGQ_LONG_LIVED_TOKEN_12345678901234567890");
  });

  it("correctly evaluates token expiration and proactive refresh windows", () => {
    const manager = new TokenManager({ refreshThresholdSeconds: 7 * 24 * 3600 });
    const now = Date.now();

    const freshToken = {
      accessToken: "token_1",
      userId: "u1",
      tokenType: "long_lived" as const,
      obtainedAt: now - 2 * 24 * 3600 * 1000,
      updatedAt: now - 2 * 24 * 3600 * 1000,
      expiresAt: now + 50 * 24 * 3600 * 1000
    };
    expect(manager.isTokenExpired(freshToken, now)).toBe(false);
    expect(manager.shouldRefreshToken(freshToken, now)).toBe(false);

    const expiringSoonToken = {
      ...freshToken,
      expiresAt: now + 3 * 24 * 3600 * 1000 // 3 days left (< 7 days threshold)
    };
    expect(manager.shouldRefreshToken(expiringSoonToken, now)).toBe(true);

    const expiredToken = {
      ...freshToken,
      expiresAt: now - 1000
    };
    expect(manager.isTokenExpired(expiredToken, now)).toBe(true);
    expect(manager.shouldRefreshToken(expiredToken, now)).toBe(false);
  });

  it("automatically refreshes an expiring long-lived token when resolving token", async () => {
    const now = Date.now();
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "IGQ_REFRESHED_LONG_TOKEN_9999999999999999",
          token_type: "bearer",
          expires_in: 5184000
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_123",
      appSecret: "secret_123",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    await client.tokens.saveToken("default", {
      accessToken: "IGQ_OLD_EXPIRING_TOKEN_1111111111111111",
      userId: "17841400001",
      tokenType: "long_lived",
      obtainedAt: now - 55 * 24 * 3600 * 1000,
      updatedAt: now - 55 * 24 * 3600 * 1000,
      expiresAt: now + 2 * 24 * 3600 * 1000 // 2 days left
    });

    const resolved = await client.resolveValidAccessToken();
    expect(resolved).toBe("IGQ_REFRESHED_LONG_TOKEN_9999999999999999");
  });
});

