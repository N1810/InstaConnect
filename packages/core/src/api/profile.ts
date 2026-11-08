import type { CacheAdapter } from "../cache/index.js";
import type { InstagramHttpClient } from "../http/index.js";
import type { InstagramProfile, RawInstagramProfileResponse } from "../types/index.js";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export const PROFILE_FIELDS = [
  "id",
  "user_id",
  "username",
  "name",
  "account_type",
  "profile_picture_url",
  "followers_count",
  "follows_count",
  "media_count",
  "biography",
  "website"
].join(",");

export const BASIC_PROFILE_FIELDS = ["id", "username", "account_type", "media_count"].join(",");

/**
 * Normalizes a raw Meta Graph API `/me` response into an `InstagramProfile`.
 */
export function normalizeProfile(raw: RawInstagramProfileResponse): InstagramProfile {
  return {
    id: String(raw.id),
    ...(raw.user_id ? { userId: String(raw.user_id) } : {}),
    username: raw.username,
    ...(raw.name ? { name: raw.name } : {}),
    accountType: raw.account_type ?? "BUSINESS",
    mediaCount: typeof raw.media_count === "number" ? raw.media_count : 0,
    ...(typeof raw.followers_count === "number" ? { followersCount: raw.followers_count } : {}),
    ...(typeof raw.follows_count === "number" ? { followsCount: raw.follows_count } : {}),
    ...(raw.biography ? { biography: raw.biography } : {}),
    ...(raw.website ? { website: raw.website } : {}),
    ...(raw.profile_picture_url ? { profilePictureUrl: raw.profile_picture_url } : {})
  };
}

/**
 * Official Meta Instagram Profile API module.
 */
export class InstagramProfileApi {
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
   * Retrieves the authorized Instagram Professional account profile.
   * Automatically falls back to basic fields if extended professional fields are not supported by the token scope.
   */
  public async get(
    options: { accountId?: string; accessToken?: string; bypassCache?: boolean } = {}
  ): Promise<InstagramProfile> {
    const token = await this.resolveToken(options);
    const cacheKey = `profile:${options.accountId ?? "me"}`;

    if (!options.bypassCache) {
      const cached = await this.cache.get<InstagramProfile>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let raw: RawInstagramProfileResponse;
    try {
      raw = await this.http.request<RawInstagramProfileResponse>(
        `${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me`,
        {
          method: "GET",
          query: {
            fields: PROFILE_FIELDS,
            access_token: token
          }
        }
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        (error.name === "InstagramAuthError" || error.name === "InstagramRateLimitError")
      ) {
        throw error;
      }
      raw = await this.http.request<RawInstagramProfileResponse>(
        `${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me`,
        {
          method: "GET",
          query: {
            fields: BASIC_PROFILE_FIELDS,
            access_token: token
          }
        }
      );
    }

    const normalized = normalizeProfile(raw);
    await this.cache.set(cacheKey, normalized, this.cacheTtlSeconds);
    return normalized;
  }
}

