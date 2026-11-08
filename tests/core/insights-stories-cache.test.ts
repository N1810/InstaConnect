import { describe, expect, it, vi } from "vitest";
import {
  InstagramClient,
  InstagramValidationError,
  MemoryCacheAdapter,
  NoopCacheAdapter,
  RedisCacheAdapter,
  assertValidGraphId,
  isAllowedInstagramUrl
} from "@instaconnect/core";

describe("@instaconnect/core - Insights, Stories, Cache Adapters & Security Utilities", () => {
  it("fetches media insights and account insights", async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/1789001/insights")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                name: "impressions",
                period: "lifetime",
                title: "Impressions",
                id: "1789001/insights/impressions/lifetime",
                values: [{ value: 1450 }]
              },
              {
                name: "reach",
                period: "lifetime",
                title: "Reach",
                id: "1789001/insights/reach/lifetime",
                values: [{ value: 1120 }]
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (url.includes("/me/insights")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                name: "profile_views",
                period: "day",
                id: "me/insights/profile_views/day",
                values: [{ value: 85, end_time: "2026-10-15T07:00:00+0000" }],
                total_value: { value: 85 }
              }
            ]
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 200 });
    });

    const client = new InstagramClient({
      appId: "app_insights",
      appSecret: "sec_insights",
      redirectUri: "https://example.com/api/instagram/callback",
      accessToken: "IGQ_VALID_TOKEN_12345678901234567890",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const mediaMetrics = await client.insights.getMediaInsights("1789001", {
      metrics: ["impressions", "reach"]
    });
    expect(mediaMetrics).toHaveLength(2);
    expect(mediaMetrics[0]?.values[0]?.value).toBe(1450);

    const accountMetrics = await client.insights.getAccountInsights({
      metrics: ["profile_views"],
      period: "day"
    });
    expect(accountMetrics[0]?.totalValue).toBe(85);

    // Rejects invalid metric names
    await expect(
      client.insights.getMediaInsights("1789001", { metrics: ["invalid-metric!"] })
    ).rejects.toThrow(InstagramValidationError);
  });

  it("fetches active stories and normalizes STORY mediaProductType", async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "story_555",
              caption: "24h Launch Story",
              media_type: "VIDEO",
              media_product_type: "STORY",
              media_url: "https://scontent.cdninstagram.com/v/story555.mp4",
              thumbnail_url: "https://scontent.cdninstagram.com/v/story555.jpg",
              permalink: "https://www.instagram.com/stories/user/555/",
              timestamp: "2026-10-15T12:00:00Z"
            }
          ],
          paging: {}
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_stories",
      appSecret: "sec_stories",
      redirectUri: "https://example.com/api/instagram/callback",
      accessToken: "IGQ_VALID_TOKEN_12345678901234567890",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const stories = await client.stories.list();
    expect(stories.data).toHaveLength(1);
    expect(stories.data[0]?.mediaProductType).toBe("STORY");
    expect(stories.data[0]?.mediaType).toBe("VIDEO");
  });

  it("iterates across multiple cursor pages using client.media.iterate()", async () => {
    let page = 0;
    const mockFetch = vi.fn(async () => {
      page += 1;
      if (page === 1) {
        return new Response(
          JSON.stringify({
            data: [{ id: "p1", media_type: "IMAGE", media_url: "https://cdninstagram.com/1.jpg" }],
            paging: {
              cursors: { after: "CURSOR_2" },
              next: "https://graph.instagram.com/v21.0/me/media?after=CURSOR_2"
            }
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          data: [{ id: "p2", media_type: "IMAGE", media_url: "https://cdninstagram.com/2.jpg" }],
          paging: {}
        }),
        { status: 200 }
      );
    });

    const client = new InstagramClient({
      appId: "app_iter",
      appSecret: "sec_iter",
      redirectUri: "https://example.com/api/instagram/callback",
      accessToken: "IGQ_VALID_TOKEN_12345678901234567890",
      fetchImplementation: mockFetch as unknown as typeof fetch
    });

    const collectedIds: string[] = [];
    for await (const batch of client.media.iterate({ limit: 1, maxPages: 5 })) {
      for (const item of batch) {
        collectedIds.push(item.id);
      }
    }
    expect(collectedIds).toEqual(["p1", "p2"]);
  });

  it("supports MemoryCacheAdapter, RedisCacheAdapter, and NoopCacheAdapter", async () => {
    const mem = new MemoryCacheAdapter({ maxEntries: 2, defaultTtlSeconds: 60 });
    await mem.set("k1", { a: 1 });
    await mem.set("k2", { a: 2 });
    await mem.set("k3", { a: 3 }); // Evicts k1
    expect(await mem.get("k1")).toBeNull();
    expect(await mem.get("k2")).toEqual({ a: 2 });

    const redisStore = new Map<string, string>();
    const fakeRedisClient = {
      get: async (k: string) => redisStore.get(k) ?? null,
      set: async (k: string, v: string) => {
        redisStore.set(k, v);
        return "OK";
      },
      del: async (k: string) => {
        redisStore.delete(k);
        return 1;
      }
    };

    const redisCache = new RedisCacheAdapter(fakeRedisClient, { prefix: "test:" });
    await redisCache.set("item1", { hello: "world" }, 120);
    expect(await redisCache.get("item1")).toEqual({ hello: "world" });
    await redisCache.delete("item1");
    expect(await redisCache.get("item1")).toBeNull();

    const noop = new NoopCacheAdapter();
    await noop.set("any", 123);
    expect(await noop.get("any")).toBeNull();
  });

  it("validates Instagram CDN URLs (SSRF prevention) and Graph IDs", () => {
    expect(isAllowedInstagramUrl("https://scontent-iad3-1.cdninstagram.com/v/t51.29350-15/1.jpg")).toBe(true);
    expect(isAllowedInstagramUrl("https://instagram.fnyc1-1.fna.fbcdn.net/v/1.mp4")).toBe(true);
    expect(isAllowedInstagramUrl("http://scontent.cdninstagram.com/insecure.jpg")).toBe(false);
    expect(isAllowedInstagramUrl("https://evil-attacker.example.com/cdninstagram.com")).toBe(false);
    expect(isAllowedInstagramUrl("http://169.254.169.254/latest/meta-data")).toBe(false);

    expect(assertValidGraphId("17895695668004550")).toBe("17895695668004550");
    expect(() => assertValidGraphId("../me/permissions")).toThrow(InstagramValidationError);
  });
});

