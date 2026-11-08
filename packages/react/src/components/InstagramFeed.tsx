import React from "react";
import { useInstagramFeed } from "../hooks/index.js";
import type { InstagramFeedProps } from "../types/index.js";
import { InstagramGrid } from "./InstagramGrid.js";

/**
 * Complete Instagram Feed component with automatic loading skeletons, error recovery,
 * Reel filtering, and "Load More" pagination.
 */
export function InstagramFeed({
  limit = 12,
  columns = 3,
  gap = 16,
  showCaptions = true,
  showReels = true,
  showLoadMore = true,
  accountId,
  apiBasePath,
  initialData,
  className = "",
  style,
  emptyState,
  errorState,
  onSelectMedia
}: InstagramFeedProps): React.JSX.Element {
  const { media, loading, loadingMore, error, hasMore, loadMore, refresh } = useInstagramFeed({
    limit,
    accountId,
    apiBasePath,
    initialData
  });

  const filteredMedia = showReels ? media : media.filter((item) => !item.isReel);

  if (loading && filteredMedia.length === 0) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading Instagram feed"
        className={`instaconnect-feed-skeleton ${className}`.trim()}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          ...style
        }}
      >
        {Array.from({ length: Math.min(limit, 6) }).map((_, idx) => (
          <div
            key={idx}
            style={{
              aspectRatio: "1 / 1",
              borderRadius: "12px",
              backgroundColor: "rgba(156, 163, 175, 0.2)"
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    if (errorState) {
      return <>{errorState(error, () => void refresh())}</>;
    }
    return (
      <div
        role="alert"
        className={`instaconnect-feed-error ${className}`.trim()}
        style={{
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          color: "#ef4444",
          ...style
        }}
      >
        <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>
          Unable to load Instagram feed: {error.message}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#ef4444",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredMedia.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`instaconnect-feed ${className}`.trim()} style={style}>
      <InstagramGrid
        media={filteredMedia}
        columns={columns}
        gap={gap}
        showCaptions={showCaptions}
        onSelectMedia={onSelectMedia}
      />

      {showLoadMore && hasMore && (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            style={{
              padding: "10px 24px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: "#1f2937",
              color: "#ffffff",
              fontWeight: 600,
              cursor: loadingMore ? "not-allowed" : "pointer",
              opacity: loadingMore ? 0.65 : 1
            }}
          >
            {loadingMore ? "Loading more..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

