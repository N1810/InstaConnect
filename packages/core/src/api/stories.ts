import type { CacheAdapter } from "../cache/index.js";
import type { InstagramHttpClient } from "../http/index.js";
import type {
  InstagramStory,
  PaginatedResponse,
  RawInstagramMediaResponse
} from "../types/index.js";
import { normalizePaging, type RawGraphPaging } from "./pagination.js";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export const STORY_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "username"
].join(",");

/**
 * Optional module for active Instagram Stories on Professional (Business & Creator) accounts.
 *
 * Official Meta API Restrictions & Limitations:
 * - Only returns stories that are currently active (within 24 hours of publication).
 * - Expired stories are not accessible via the `/me/stories` endpoint.
 * - Cannot access stories of arbitrary third-party users.
 * - Stories shared by other users that mention the business are not returned here.
 */
export class InstagramStoriesApi {
  private readonly http: InstagramHttpClient;
  private readonly cache: CacheAdapter;
  private readonly apiVersion: string;
  private readonly cacheTtlSeconds: number;
  private readonly resolveToken: (options?: {
    accountId?: string;
    accessToken?: string;
  }) => Promise<string>;

  constructor(options: {
    http: InstagramHttpClient;
    cache: CacheAdapter;
    apiVersion: string;
    cacheTtlSeconds: number;
    resolveToken: (options?: { accountId?: string; accessToken?: string }) => Promise<string>;
  }) {
    this.http = options.http;
    this.cache = options.cache;
    this.apiVersion = options.apiVersion;
    this.cacheTtlSeconds = options.cacheTtlSeconds;
    this.resolveToken = options.resolveToken;
  }

  /**
   * Lists currently active (non-expired, 24h) stories for the authorized Professional account.
   */
  public async list(
    options: {
      limit?: number;
      after?: string;
      accountId?: string;
      accessToken?: string;
      bypassCache?: boolean;
    } = {}
  ): Promise<PaginatedResponse<InstagramStory>> {
    const token = await this.resolveToken(options);
    const cacheKey = `stories:list:${options.accountId ?? "me"}:${options.after ?? ""}`;

    if (!options.bypassCache) {
      const cached = await this.cache.get<PaginatedResponse<InstagramStory>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const raw = await this.http.request<{
      data?: RawInstagramMediaResponse[];
      paging?: RawGraphPaging;
    }>(`${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me/stories`, {
      method: "GET",
      query: {
        fields: STORY_FIELDS,
        limit: options.limit ?? 25,
        after: options.after,
        access_token: token
      }
    });

    const stories: InstagramStory[] = (raw.data ?? []).map((item) => ({
      id: String(item.id),
      ...(item.caption ? { caption: item.caption } : {}),
      mediaType: item.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
      mediaProductType: "STORY",
      mediaUrl: item.media_url ?? item.thumbnail_url ?? "",
      ...(item.thumbnail_url ? { thumbnailUrl: item.thumbnail_url } : {}),
      permalink: item.permalink ?? "",
      timestamp: item.timestamp ?? new Date(0).toISOString(),
      ...(item.username ? { username: item.username } : {})
    }));

    const result: PaginatedResponse<InstagramStory> = {
      data: stories,
      paging: normalizePaging(raw.paging)
    };

    await this.cache.set(cacheKey, result, Math.min(this.cacheTtlSeconds, 60));
    return result;
  }
}

