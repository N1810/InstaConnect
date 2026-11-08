import type { CacheAdapter } from "../cache/index.js";
import type { TokenStorageAdapter } from "../auth/token-manager.js";

/**
 * Supported official Meta Instagram API scopes for Instagram Login (Business & Creator).
 */
export type InstagramScope =
  | "instagram_business_basic"
  | "instagram_business_manage_messages"
  | "instagram_business_manage_comments"
  | "instagram_business_content_publish"
  | "instagram_business_manage_insights"
  | "user_profile"
  | "user_media";

/**
 * Account types returned by the official Meta Instagram API.
 */
export type InstagramAccountType = "BUSINESS" | "MEDIA_CREATOR" | "PERSONAL";

/**
 * Media types returned by the Meta Instagram API.
 */
export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

/**
 * Media product types distinguishing Feed, Reels, Story, or Ad placements.
 */
export type InstagramMediaProductType = "FEED" | "REELS" | "STORY" | "AD";

/**
 * Normalized child item inside a CAROUSEL_ALBUM media post.
 */
export interface InstagramCarouselChild {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
}

/**
 * Normalized Instagram Media item (Post, Reel, or Carousel Album).
 */
export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: InstagramMediaType;
  mediaProductType?: InstagramMediaProductType;
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  username?: string;
  likeCount?: number;
  commentsCount?: number;
  children: InstagramCarouselChild[];
  isReel: boolean;
  isCarousel: boolean;
}

/**
 * Raw media item returned directly by the Meta Graph API.
 */
export interface RawInstagramMediaResponse {
  id: string;
  caption?: string;
  media_type: InstagramMediaType;
  media_product_type?: InstagramMediaProductType;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data: Array<{
      id: string;
      media_type: "IMAGE" | "VIDEO";
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    }>;
  };
}

/**
 * Normalized Instagram Profile information.
 */
export interface InstagramProfile {
  id: string;
  userId?: string;
  username: string;
  name?: string;
  accountType: InstagramAccountType;
  mediaCount: number;
  followersCount?: number;
  followsCount?: number;
  biography?: string;
  website?: string;
  profilePictureUrl?: string;
}

/**
 * Raw profile payload from `GET /me`.
 */
export interface RawInstagramProfileResponse {
  id: string;
  user_id?: string;
  username: string;
  name?: string;
  account_type?: InstagramAccountType;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
}

/**
 * Cursor-based pagination metadata returned by Meta APIs.
 */
export interface InstagramPagingCursors {
  before?: string;
  after?: string;
}

export interface InstagramPaging {
  cursors?: InstagramPagingCursors;
  next?: string;
  previous?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  paging: InstagramPaging;
}

/**
 * Token record representing short-lived or long-lived Meta OAuth tokens.
 */
export interface InstagramTokenRecord {
  accessToken: string;
  userId: string;
  tokenType: "short_lived" | "long_lived";
  expiresAt?: number; // Unix timestamp in milliseconds
  permissions?: string[];
  obtainedAt: number;
  updatedAt: number;
}

/**
 * Insights metric period.
 */
export type InstagramInsightPeriod = "day" | "week" | "days_28" | "month" | "lifetime";

/**
 * Single insight metric value entry.
 */
export interface InstagramInsightValue {
  value: number | Record<string, number>;
  endTime?: string;
}

/**
 * Normalized insight metric object.
 */
export interface InstagramInsightMetric {
  name: string;
  period: InstagramInsightPeriod;
  title?: string;
  description?: string;
  id: string;
  values: InstagramInsightValue[];
  totalValue?: number;
}

/**
 * Normalized Instagram Story item (available for 24h on Professional accounts).
 */
export interface InstagramStory {
  id: string;
  caption?: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaProductType: "STORY";
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  username?: string;
}

/**
 * Options for initializing `InstagramClient`.
 */
export interface InstagramClientConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  apiVersion?: string;
  accessToken?: string;
  defaultAccountId?: string;
  stateSecret?: string;
  cache?: CacheAdapter;
  tokenStorage?: TokenStorageAdapter;
  cacheTtlSeconds?: number;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  fetchImplementation?: typeof fetch;
}

/**
 * Parameters for listing media.
 */
export interface ListMediaOptions {
  limit?: number;
  after?: string;
  before?: string;
  accountId?: string;
  accessToken?: string;
  bypassCache?: boolean;
  mediaProductType?: InstagramMediaProductType;
}

/**
 * Options for generating OAuth authorization URL.
 */
export interface AuthorizationUrlOptions {
  state?: string;
  scopes?: InstagramScope[];
  redirectUri?: string;
  enableFbLogin?: boolean;
  forceAuthentication?: boolean;
}

