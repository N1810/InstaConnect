import type { CSSProperties, ReactNode } from "react";
import type {
  InstagramMedia,
  InstagramProfile,
  PaginatedResponse
} from "@instaconnect/core";

/**
 * Configuration for the client-side InstaConnect React context.
 * Points to server-side proxy endpoints so credentials are never exposed in browser bundles.
 */
export interface InstagramReactConfig {
  /**
   * Base endpoint for Instagram server routes. Default: `/api/instagram`
   */
  apiBasePath?: string;
  /**
   * Optional custom fetcher for testing or custom auth headers.
   */
  fetcher?: <T>(url: string, init?: RequestInit) => Promise<T>;
  /**
   * Optional account identifier for multi-account applications.
   */
  accountId?: string;
}

export interface UseInstagramFeedOptions {
  limit?: number;
  initialData?: PaginatedResponse<InstagramMedia>;
  accountId?: string;
  apiBasePath?: string;
  enabled?: boolean;
  filterReels?: boolean;
}

export interface UseInstagramFeedResult {
  media: InstagramMedia[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseInstagramProfileOptions {
  initialData?: InstagramProfile;
  accountId?: string;
  apiBasePath?: string;
  enabled?: boolean;
}

export interface UseInstagramProfileResult {
  profile: InstagramProfile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseInstagramMediaOptions {
  mediaId: string;
  accountId?: string;
  apiBasePath?: string;
  enabled?: boolean;
}

export interface UseInstagramMediaResult {
  item: InstagramMedia | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseInstagramReelsOptions {
  limit?: number;
  accountId?: string;
  apiBasePath?: string;
  enabled?: boolean;
}

export interface UseInstagramConnectionOptions {
  accountId?: string;
  apiBasePath?: string;
  connectPath?: string;
  disconnectPath?: string;
}

export interface UseInstagramConnectionResult {
  connected: boolean;
  profile: InstagramProfile | null;
  loading: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface InstagramGridProps {
  media: InstagramMedia[];
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: number;
  showCaptions?: boolean;
  onSelectMedia?: (item: InstagramMedia) => void;
  className?: string;
  style?: CSSProperties;
  renderItem?: (item: InstagramMedia) => ReactNode;
}

export interface InstagramFeedProps {
  limit?: number;
  layout?: "grid" | "masonry" | "list";
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: number;
  showCaptions?: boolean;
  showReels?: boolean;
  showLoadMore?: boolean;
  accountId?: string;
  apiBasePath?: string;
  initialData?: PaginatedResponse<InstagramMedia>;
  className?: string;
  style?: CSSProperties;
  emptyState?: ReactNode;
  errorState?: (error: Error, retry: () => void) => ReactNode;
  onSelectMedia?: (item: InstagramMedia) => void;
}

export interface InstagramReelsProps {
  limit?: number;
  autoplay?: boolean;
  showControls?: boolean;
  columns?: 1 | 2 | 3 | 4;
  gap?: number;
  accountId?: string;
  apiBasePath?: string;
  media?: InstagramMedia[];
  className?: string;
  style?: CSSProperties;
}

export interface InstagramProfileProps {
  profile?: InstagramProfile | null;
  accountId?: string;
  apiBasePath?: string;
  showAvatar?: boolean;
  showUsername?: boolean;
  showMediaCount?: boolean;
  showBio?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface InstagramConnectButtonProps {
  connectUrl?: string;
  label?: string;
  connectingLabel?: string;
  onConnect?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

