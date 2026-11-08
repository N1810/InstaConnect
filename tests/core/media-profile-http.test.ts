import { describe, expect, it, vi } from "vitest";
import {
  InstagramAuthError,
  InstagramClient,
  InstagramRateLimitError,
  sanitizeErrorMessage
} from "@instaconnect/core";

describe("@instaconnect/core - Media, Profile, Pagination, Caching & Rate Limiting", () => {
  it("fetches and normalizes IMAGE, VIDEO, REELS, and CAROUSEL_ALBUM items", async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "1001",
              caption: "Studio portrait #photography",
              media_type: "IMAGE",
              media_product_type: "FEED",
              media_url: "https://scontent.cdninstagram.com/v/image1001.jpg",
              permalink: "https://www.instagram.com/p/ABC1001/",
              timestamp: "2026-10-01T12:00:00+0000"
            },
            {
              id: "1002",
              caption: "Behind the scenes reel",
              media_type: "VIDEO",
              media_product_type: "REELS",
              media_url: "https://scontent.cdninstagram.com/v/video1002.mp4",
              thumbnail_url: "https://scontent.cdninstagram.com/v/thumb1002.jpg",
              permalink: "https://www.instagram.com/reel/DEF1002/",
              timestamp: "2026-10-02T12:00:00+0000"
            },
            {
              id: "1003",
              caption: "Product launch carousel",
              media_type: "CAROUSEL_ALBUM",
              media_product_type: "FEED",
              media_url: "https://scontent.cdninstagram.com/v/carousel1.jpg",
              permalink: "https://www.instagram.com/p/GHI1003/",
              timestamp: "2026-10-03T12:00:00+0000",
              children: {
                data: [
                  {
                    id: "1003_1",
                    media_type: "IMAGE",
                    media_url: "https://scontent.cdninstagram.com/v/carousel1.jpg"
                  },
                  {
                    id: "1003_2",
                    media_type: "VIDEO",
                    media_url: "https://scontent.cdninstagram.com/v/carousel2.mp4",
                    thumbnail_url: "https://scontent.cdninstagram.com/v/carousel2_thumb.jpg"
                  }
                ]
              }
            }
          ],
          paging: {
            cursors: {
              before: "CURSOR_BEFORE_1",
              after: "CURSOR_AFTER_1"
            },
            next: "https://graph.instagram.com/v21.0/me/media?after=CURSOR_AFTER_1"
          }
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_1",
      appSecret: "secret_1",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      accessToken: "IGQ_VALID_ACCESS_TOKEN_12345678901234567890",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const res = await client.media.list({ limit: 12 });
    expect(res.data).toHaveLength(3);
    expect(res.paging.hasNextPage).toBe(true);
    expect(res.paging.cursors?.after).toBe("CURSOR_AFTER_1");

    const [imageItem, reelItem, carouselItem] = res.data;
    expect(imageItem?.isReel).toBe(false);
    expect(imageItem?.isCarousel).toBe(false);

    expect(reelItem?.isReel).toBe(true);
    expect(reelItem?.mediaProductType).toBe("REELS");
    expect(reelItem?.thumbnailUrl).toBe("https://scontent.cdninstagram.com/v/thumb1002.jpg");

    expect(carouselItem?.isCarousel).toBe(true);
    expect(carouselItem?.children).toHaveLength(2);
    expect(carouselItem?.children[1]?.mediaType).toBe("VIDEO");

    // Second call with same parameters hits in-memory cache
    await client.media.list({ limit: 12 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches profile information and normalizes fields", async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "178414001",
          username: "instaconnect.dev",
          account_type: "BUSINESS",
          media_count: 84,
          followers_count: 14200,
          biography: "Official SDK for Next.js"
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_1",
      appSecret: "secret_1",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      accessToken: "IGQ_VALID_ACCESS_TOKEN_12345678901234567890",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const profile = await client.profile.get();
    expect(profile.username).toBe("instaconnect.dev");
    expect(profile.accountType).toBe("BUSINESS");
    expect(profile.mediaCount).toBe(84);
    expect(profile.followersCount).toBe(14200);
  });

  it("retries transient rate limit errors (429) with backoff and does NOT retry 401 OAuth errors", async () => {
    let attempts = 0;
    const rateLimitedFetch = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Application request limit reached",
              type: "OAuthException",
              code: 4
            }
          }),
          { status: 429, headers: { "retry-after": "0" } }
        );
      }
      return new Response(
        JSON.stringify({
          id: "178414001",
          username: "recovered.account",
          account_type: "MEDIA_CREATOR",
          media_count: 12
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_1",
      appSecret: "secret_1",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      accessToken: "IGQ_VALID_ACCESS_TOKEN_12345678901234567890",
      baseRetryDelayMs: 5,
      maxRetries: 2,
      fetchImplementation: rateLimitedFetch as unknown as typeof fetch
    });

    const profile = await client.profile.get();
    expect(profile.username).toBe("recovered.account");
    expect(attempts).toBe(2);

    // Permanent OAuth failure should not retry
    let authAttempts = 0;
    const unauthorizedFetch = vi.fn(async () => {
      authAttempts += 1;
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid OAuth access token.",
            type: "OAuthException",
            code: 190
          }
        }),
        { status: 401 }
      );
    });

    const badClient = new InstagramClient({
      appId: "app_1",
      appSecret: "secret_1",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      accessToken: "IGQ_INVALID_TOKEN_12345678901234567890",
      baseRetryDelayMs: 5,
      maxRetries: 3,
      fetchImplementation: unauthorizedFetch as unknown as typeof fetch
    });

    await expect(badClient.profile.get()).rejects.toThrow(InstagramAuthError);
    expect(authAttempts).toBe(1);
  });

  it("redacts sensitive access tokens and secrets from error messages", () => {
    const raw =
      "Request failed for https://graph.instagram.com/me?access_token=IGQWRP12345678901234567890abcdef&client_secret=my_secret_value";
    const sanitized = sanitizeErrorMessage(raw);
    expect(sanitized).not.toContain("IGQWRP12345678901234567890abcdef");
    expect(sanitized).not.toContain("my_secret_value");
    expect(sanitized).toContain("access_token=[REDACTED]");
    expect(sanitized).toContain("client_secret=[REDACTED]");
  });

  it("exposes InstagramRateLimitError metadata when retries are exhausted", async () => {
    const always429Fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: "User request limit reached",
            code: 17
          }
        }),
        { status: 429 }
      );
    });

    const client = new InstagramClient({
      appId: "app_1",
      appSecret: "secret_1",
      redirectUri: "http://localhost:3000/api/instagram/callback",
      accessToken: "IGQ_VALID_TOKEN_12345678901234567890",
      maxRetries: 0,
      fetchImplementation: always429Fetch as unknown as typeof fetch
    });

    await expect(client.media.list()).rejects.toThrow(InstagramRateLimitError);
  });
});

