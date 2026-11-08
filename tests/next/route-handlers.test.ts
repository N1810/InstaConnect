import { describe, expect, it, vi } from "vitest";
import { InstagramClient } from "@instaconnect/core";
import {
  OAUTH_STATE_COOKIE_NAME,
  createInstagramCallbackHandler,
  createInstagramConnectHandler,
  createInstagramDisconnectHandler,
  createInstagramMediaHandler,
  createInstagramProfileHandler
} from "@instaconnect/next/server";

describe("@instaconnect/next - App Router Route Handlers", () => {
  function createMockClient() {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oauth/access_token")) {
        return new Response(
          JSON.stringify({
            access_token: "IGQ_SHORT_TOKEN_12345678901234567890",
            user_id: "178414001"
          }),
          { status: 200 }
        );
      }
      if (url.includes("/access_token")) {
        return new Response(
          JSON.stringify({
            access_token: "IGQ_LONG_TOKEN_12345678901234567890",
            token_type: "bearer",
            expires_in: 5184000
          }),
          { status: 200 }
        );
      }
      if (url.includes("/me/media")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "9001",
                caption: "Route handler post",
                media_type: "IMAGE",
                media_url: "https://scontent.cdninstagram.com/v/9001.jpg",
                permalink: "https://www.instagram.com/p/9001/",
                timestamp: "2026-10-15T00:00:00Z"
              }
            ],
            paging: {}
          }),
          { status: 200 }
        );
      }
      if (url.includes("/me")) {
        return new Response(
          JSON.stringify({
            id: "178414001",
            username: "next.app.user",
            account_type: "BUSINESS",
            media_count: 19
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 200 });
    });

    return new InstagramClient({
      appId: "next_app_id",
      appSecret: "next_app_secret",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      stateSecret: "next_route_test_secret_key_32_bytes",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });
  }

  it("handles OAuth connect redirect, sets HttpOnly state cookie, and completes callback", async () => {
    const client = createMockClient();
    const connectGET = createInstagramConnectHandler({ client });

    const connectReq = new Request("http://localhost:3000/api/instagram/connect");
    const connectRes = await connectGET(connectReq);

    expect(connectRes.status).toBe(302);
    const location = connectRes.headers.get("Location");
    const setCookie = connectRes.headers.get("Set-Cookie");
    expect(location).toContain("https://www.instagram.com/oauth/authorize");
    expect(setCookie).toContain(OAUTH_STATE_COOKIE_NAME);
    expect(setCookie).toContain("HttpOnly");

    const redirectUrl = new URL(location!);
    const state = redirectUrl.searchParams.get("state")!;

    let callbackAccountId = "";
    const callbackGET = createInstagramCallbackHandler({
      client,
      successRedirectUrl: "/dashboard",
      onSuccess: (acc) => {
        callbackAccountId = acc.accountId;
      }
    });

    const callbackReq = new Request(
      `http://localhost:3000/api/instagram/callback?code=valid_code_123&state=${encodeURIComponent(state)}`,
      {
        headers: {
          cookie: `${OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(state)}`
        }
      }
    );

    const callbackRes = await callbackGET(callbackReq);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get("Location")).toBe("http://localhost:3000/dashboard");
    expect(callbackAccountId).toBe("178414001");

    // Subsequent media & profile route requests use stored token
    const mediaGET = createInstagramMediaHandler({ client });
    const mediaRes = await mediaGET(new Request("http://localhost:3000/api/instagram/media?limit=6"));
    expect(mediaRes.status).toBe(200);
    const mediaJson = (await mediaRes.json()) as { data: Array<{ id: string }> };
    expect(mediaJson.data[0]?.id).toBe("9001");

    const profileGET = createInstagramProfileHandler({ client });
    const profileRes = await profileGET(new Request("http://localhost:3000/api/instagram/profile"));
    expect(profileRes.status).toBe(200);
    const profileJson = (await profileRes.json()) as { username: string };
    expect(profileJson.username).toBe("next.app.user");

    // Disconnect removes token
    const disconnectPOST = createInstagramDisconnectHandler({ client });
    const disconnectRes = await disconnectPOST(
      new Request("http://localhost:3000/api/instagram/disconnect", { method: "POST" })
    );
    expect(disconnectRes.status).toBe(200);
  });
});

