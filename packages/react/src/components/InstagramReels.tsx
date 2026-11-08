import React from "react";
import { useInstagramReels } from "../hooks/index.js";
import type { InstagramReelsProps } from "../types/index.js";

/**
 * Dedicated 9:16 vertical video component for displaying Instagram Reels.
 */
export function InstagramReels({
  limit = 6,
  autoplay = false,
  showControls = true,
  columns = 3,
  gap = 16,
  accountId,
  apiBasePath,
  media: externalMedia,
  className = "",
  style
}: InstagramReelsProps): React.JSX.Element {
  const { media: fetchedReels, loading, error, refresh } = useInstagramReels({
    limit,
    accountId,
    apiBasePath,
    enabled: !externalMedia
  });

  const reels = externalMedia ?? fetchedReels;

  if (loading && reels.length === 0) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading Instagram Reels"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          ...style
        }}
      >
        {Array.from({ length: Math.min(limit, 3) }).map((_, idx) => (
          <div
            key={idx}
            style={{
              aspectRatio: "9 / 16",
              borderRadius: "14px",
              backgroundColor: "rgba(156, 163, 175, 0.2)"
            }}
          />
        ))}
      </div>
    );
  }

  if (error && !externalMedia) {
    return (
      <div
        role="alert"
        style={{
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          color: "#ef4444"
        }}
      >
        <p style={{ margin: "0 0 8px 0" }}>Failed to load Reels: {error.message}</p>
        <button type="button" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div
        role="status"
        style={{
          padding: "2rem",
          textAlign: "center",
          borderRadius: "12px",
          border: "1px dashed rgba(128,128,128,0.35)",
          color: "#6b7280"
        }}
      >
        No Instagram Reels available.
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Instagram Reels"
      className={`instaconnect-reels ${className}`.trim()}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        ...style
      }}
    >
      {reels.slice(0, limit).map((reel) => (
        <article
          key={reel.id}
          role="listitem"
          style={{
            position: "relative",
            aspectRatio: "9 / 16",
            borderRadius: "14px",
            overflow: "hidden",
            backgroundColor: "#000000",
            border: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <video
            src={reel.mediaUrl}
            poster={reel.thumbnailUrl}
            controls={showControls}
            autoPlay={autoplay}
            muted={autoplay}
            loop={autoplay}
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
          {reel.caption && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px",
                background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                color: "#ffffff",
                fontSize: "12px",
                pointerEvents: "none"
              }}
            >
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {reel.caption}
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

