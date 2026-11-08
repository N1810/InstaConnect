import type { CacheAdapter } from "../cache/index.js";
import type { InstagramHttpClient } from "../http/index.js";
import type {
  InstagramCarouselChild,
  InstagramMedia,
  ListMediaOptions,
  PaginatedResponse,
  RawInstagramMediaResponse
} from "../types/index.js";
import { assertValidGraphId } from "../utils/index.js";
import { normalizePaging, paginateCursor, type RawGraphPaging } from "./pagination.js";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "username",
  "like_count",
  "comments_count",
  "children{id,media_type,media_url,thumbnail_url,permalink,timestamp}"
].join(",");

export const CHILDREN_FIELDS = [
  "id",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp"
].join(",");

/**
 * Normalizes a raw Meta Graph API media object into a clean `InstagramMedia` item.
 */
export function normalizeMediaItem(raw: RawInstagramMediaResponse): InstagramMedia {
  const children: InstagramCarouselChild[] = (raw.children?.data ?? []).map((child) => ({
    id: String(child.id),
    mediaType: child.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
    mediaUrl: child.media_url ?? child.thumbnail_url ?? "",
    ...(child.thumbnail_url ? { thumbnailUrl: child.thumbnail_url } : {}),
    ...(child.permalink ? { permalink: child.permalink } : {}),
    ...(child.timestamp ? { timestamp: child.timestamp } : {})
  }));

  const isCarousel = raw.media_type === "CAROUSEL_ALBUM";
  const isReel =
    raw.media_product_type === "REELS" ||
    (raw.media_type === "VIDEO" && Boolean(raw.permalink?.includes("/reel/")));

  const primaryMediaUrl =
    raw.media_url ?? children[0]?.mediaUrl ?? raw.thumbnail_url ?? "";

  return {
    id: String(raw.id),
    ...(raw.caption !== undefined ? { caption: raw.caption } : {}),
    mediaType: raw.media_type,
    ...(raw.media_product_type ? { mediaProductType: raw.media_product_type } : {}),
    mediaUrl: primaryMediaUrl,
    ...(raw.thumbnail_url ? { thumbnailUrl: raw.thumbnail_url } : {}),
    permalink: raw.permalink ?? "",
    timestamp: raw.timestamp ?? new Date(0).toISOString(),
    ...(raw.username ? { username: raw.username } : {}),
    ...(typeof raw.like_count === "number" ? { likeCount: raw.like_count } : {}),
    ...(typeof raw.comments_count === "number" ? { commentsCount: raw.comments_count } : {}),
    children,
    isReel,
    isCarousel
  };
}

/**
 * Official Meta Instagram Media API module.
 * Supports listing posts, Reels, CAROUSEL_ALBUM items, individual media details, and carousel child media.
 */
export class InstagramMediaApi {
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
   * Lists Instagram media (IMAGE, VIDEO, CAROUSEL_ALBUM, REELS) with cursor pagination.
   */
  public async list(options: ListMediaOptions = {}): Promise<PaginatedResponse<InstagramMedia>> {
    const limit = Math.min(Math.max(options.limit ?? 12, 1), 100);
    const token = await this.resolveToken({
      accountId: options.accountId,
      accessToken: options.accessToken
    });

    const cacheKey = `media:list:${options.accountId ?? "me"}:${limit}:${options.after ?? ""}:${options.before ?? ""}:${options.mediaProductType ?? "ALL"}`;
    if (!options.bypassCache) {
      const cached = await this.cache.get<PaginatedResponse<InstagramMedia>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const rawResponse = await this.http.request<{
      data?: RawInstagramMediaResponse[];
      paging?: RawGraphPaging;
    }>(`${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me/media`, {
      method: "GET",
      query: {
        fields: MEDIA_FIELDS,
        limit,
        after: options.after,
        before: options.before,
        access_token: token
      }
    });

    let normalizedItems = (rawResponse.data ?? []).map(normalizeMediaItem);
    if (options.mediaProductType) {
      normalizedItems = normalizedItems.filter(
        (item) =>
          item.mediaProductType === options.mediaProductType ||
          (options.mediaProductType === "REELS" && item.isReel)
      );
    }

    const result: PaginatedResponse<InstagramMedia> = {
      data: normalizedItems,
      paging: normalizePaging(rawResponse.paging)
    };

    await this.cache.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }

  /**
   * Convenience method to fetch only Instagram Reels.
   */
  public async listReels(
    options: Omit<ListMediaOptions, "mediaProductType"> = {}
  ): Promise<PaginatedResponse<InstagramMedia>> {
    const response = await this.list({
      ...options,
      limit: options.limit ? Math.min(options.limit * 2, 50) : 24
    });

    const reelsOnly = response.data.filter((item) => item.isReel);
    return {
      data: options.limit ? reelsOnly.slice(0, options.limit) : reelsOnly,
      paging: response.paging
    };
  }

  /**
   * Fetches a single Instagram media item by ID.
   */
  public async get(
    mediaId: string,
    options: { accountId?: string; accessToken?: string; bypassCache?: boolean } = {}
  ): Promise<InstagramMedia> {
    const safeId = assertValidGraphId(mediaId, "mediaId");
    const token = await this.resolveToken(options);
    const cacheKey = `media:item:${safeId}`;

    if (!options.bypassCache) {
      const cached = await this.cache.get<InstagramMedia>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const raw = await this.http.request<RawInstagramMediaResponse>(
      `${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/${safeId}`,
      {
        method: "GET",
        query: {
          fields: MEDIA_FIELDS,
          access_token: token
        }
      }
    );

    const normalized = normalizeMediaItem(raw);
    await this.cache.set(cacheKey, normalized, this.cacheTtlSeconds);
    return normalized;
  }

  /**
   * Fetches the child media items of a `CAROUSEL_ALBUM` post.
   */
  public async getChildren(
    mediaId: string,
    options: { accountId?: string; accessToken?: string; bypassCache?: boolean } = {}
  ): Promise<InstagramCarouselChild[]> {
    const safeId = assertValidGraphId(mediaId, "mediaId");
    const token = await this.resolveToken(options);
    const cacheKey = `media:children:${safeId}`;

    if (!options.bypassCache) {
      const cached = await this.cache.get<InstagramCarouselChild[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const raw = await this.http.request<{
      data?: Array<{
        id: string;
        media_type: "IMAGE" | "VIDEO";
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        timestamp?: string;
      }>;
    }>(`${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/${safeId}/children`, {
      method: "GET",
      query: {
        fields: CHILDREN_FIELDS,
        access_token: token
      }
    });

    const children: InstagramCarouselChild[] = (raw.data ?? []).map((child) => ({
      id: String(child.id),
      mediaType: child.media_type === "VIDEO" ? "VIDEO" : "IMAGE",
      mediaUrl: child.media_url ?? child.thumbnail_url ?? "",
      ...(child.thumbnail_url ? { thumbnailUrl: child.thumbnail_url } : {}),
      ...(child.permalink ? { permalink: child.permalink } : {}),
      ...(child.timestamp ? { timestamp: child.timestamp } : {})
    }));

    await this.cache.set(cacheKey, children, this.cacheTtlSeconds);
    return children;
  }

  /**
   * Returns an async generator to iterate over multiple pages of media automatically.
   */
  public iterate(
    options: ListMediaOptions & { maxPages?: number } = {}
  ): AsyncGenerator<InstagramMedia[], void, unknown> {
    return paginateCursor(
      (cursor) =>
        this.list({
          ...options,
          after: cursor
        }),
      {
        maxPages: options.maxPages,
        initialCursor: options.after
      }
    );
  }
}

