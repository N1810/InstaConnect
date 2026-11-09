import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InstagramMedia,
  InstagramProfile,
  PaginatedResponse
} from "@neerajkr1810/instaconnect-core";
import { useInstagramConfig } from "../context/index.js";
import type {
  UseInstagramConnectionOptions,
  UseInstagramConnectionResult,
  UseInstagramFeedOptions,
  UseInstagramFeedResult,
  UseInstagramMediaOptions,
  UseInstagramMediaResult,
  UseInstagramProfileOptions,
  UseInstagramProfileResult,
  UseInstagramReelsOptions
} from "../types/index.js";

/**
 * Headless React hook for fetching and paginating an Instagram feed.
 * Uses server-side proxy endpoints so access tokens are never exposed in client code.
 */
export function useInstagramFeed(options: UseInstagramFeedOptions = {}): UseInstagramFeedResult {
  const config = useInstagramConfig();
  const limit = options.limit ?? 12;
  const basePath = options.apiBasePath ?? config.apiBasePath;
  const accountId = options.accountId ?? config.accountId;
  const enabled = options.enabled ?? true;
  const filterReels = options.filterReels ?? false;

  const [media, setMedia] = useState<InstagramMedia[]>(options.initialData?.data ?? []);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    options.initialData?.paging?.cursors?.after
  );
  const [hasMore, setHasMore] = useState<boolean>(
    options.initialData?.paging?.hasNextPage ?? false
  );
  const [loading, setLoading] = useState<boolean>(!options.initialData && enabled);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchFeedPage = useCallback(
    async (cursor?: string, append = false) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (cursor) {
        params.set("after", cursor);
      }
      if (accountId) {
        params.set("accountId", accountId);
      }
      if (filterReels) {
        params.set("type", "REELS");
      }

      const url = `${basePath}/media?${params.toString()}`;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await config.fetcher<PaginatedResponse<InstagramMedia>>(url);
        if (!isMountedRef.current) return;

        const items = response.data ?? [];
        setMedia((prev) => (append ? [...prev, ...items] : items));
        setNextCursor(response.paging?.cursors?.after);
        setHasMore(Boolean(response.paging?.hasNextPage && response.paging?.cursors?.after));
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch Instagram feed"));
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [accountId, basePath, config, filterReels, limit]
  );

  useEffect(() => {
    if (!enabled || options.initialData) {
      return;
    }
    void fetchFeedPage(undefined, false);
  }, [enabled, fetchFeedPage, options.initialData]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !nextCursor) {
      return;
    }
    await fetchFeedPage(nextCursor, true);
  }, [fetchFeedPage, hasMore, loading, loadingMore, nextCursor]);

  const refresh = useCallback(async () => {
    await fetchFeedPage(undefined, false);
  }, [fetchFeedPage]);

  return {
    media,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh
  };
}

/**
 * Headless React hook for fetching only Instagram Reels.
 */
export function useInstagramReels(options: UseInstagramReelsOptions = {}): UseInstagramFeedResult {
  return useInstagramFeed({
    limit: options.limit ?? 6,
    accountId: options.accountId,
    apiBasePath: options.apiBasePath,
    enabled: options.enabled,
    filterReels: true
  });
}

/**
 * Headless React hook for retrieving the connected Instagram Professional profile.
 */
export function useInstagramProfile(
  options: UseInstagramProfileOptions = {}
): UseInstagramProfileResult {
  const config = useInstagramConfig();
  const basePath = options.apiBasePath ?? config.apiBasePath;
  const accountId = options.accountId ?? config.accountId;
  const enabled = options.enabled ?? true;

  const [profile, setProfile] = useState<InstagramProfile | null>(options.initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!options.initialData && enabled);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (accountId) {
      params.set("accountId", accountId);
    }
    const queryString = params.toString();
    const url = `${basePath}/profile${queryString ? `?${queryString}` : ""}`;

    try {
      const data = await config.fetcher<InstagramProfile>(url);
      if (!isMountedRef.current) return;
      setProfile(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error("Failed to load Instagram profile"));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [accountId, basePath, config]);

  useEffect(() => {
    if (!enabled || options.initialData) {
      return;
    }
    void fetchProfile();
  }, [enabled, fetchProfile, options.initialData]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile
  };
}

/**
 * Headless React hook for retrieving a single Instagram media item by ID.
 */
export function useInstagramMedia(options: UseInstagramMediaOptions): UseInstagramMediaResult {
  const config = useInstagramConfig();
  const basePath = options.apiBasePath ?? config.apiBasePath;
  const accountId = options.accountId ?? config.accountId;
  const enabled = (options.enabled ?? true) && Boolean(options.mediaId);

  const [item, setItem] = useState<InstagramMedia | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMediaItem = useCallback(async () => {
    if (!options.mediaId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("id", options.mediaId);
    if (accountId) {
      params.set("accountId", accountId);
    }

    try {
      const data = await config.fetcher<InstagramMedia>(
        `${basePath}/media?${params.toString()}`
      );
      if (!isMountedRef.current) return;
      setItem(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error("Failed to fetch Instagram media item"));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [accountId, basePath, config, options.mediaId]);

  useEffect(() => {
    if (!enabled) return;
    void fetchMediaItem();
  }, [enabled, fetchMediaItem]);

  return {
    item,
    loading,
    error,
    refresh: fetchMediaItem
  };
}

/**
 * Headless React hook for managing OAuth connection status, initiating connect, and disconnecting.
 */
export function useInstagramConnection(
  options: UseInstagramConnectionOptions = {}
): UseInstagramConnectionResult {
  const config = useInstagramConfig();
  const basePath = options.apiBasePath ?? config.apiBasePath;
  const accountId = options.accountId ?? config.accountId;
  const connectPath = options.connectPath ?? `${basePath}/connect`;
  const disconnectPath = options.disconnectPath ?? `${basePath}/disconnect`;

  const { profile, loading, error, refresh } = useInstagramProfile({
    accountId,
    apiBasePath: basePath
  });

  const [disconnecting, setDisconnecting] = useState(false);

  const connect = useCallback(() => {
    if (typeof window !== "undefined") {
      const url = accountId
        ? `${connectPath}?accountId=${encodeURIComponent(accountId)}`
        : connectPath;
      window.location.assign(url);
    }
  }, [accountId, connectPath]);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await config.fetcher(disconnectPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId })
      });
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  }, [accountId, config, disconnectPath, refresh]);

  return {
    connected: Boolean(profile && !error),
    profile: error ? null : profile,
    loading: loading || disconnecting,
    error,
    connect,
    disconnect,
    refresh
  };
}

