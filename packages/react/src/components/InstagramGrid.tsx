import React, { useState } from "react";
import type { InstagramMedia } from "@instaconnect/core";
import type { InstagramGridProps } from "../types/index.js";

/**
 * Responsive, accessible grid component for displaying Instagram posts, Reels, and Carousels.
 * Does not assume Next.js Image remote domain configuration so it works out-of-the-box with Meta CDN URLs.
 */
export function InstagramGrid({
  media,
  columns = 3,
  gap = 16,
  showCaptions = false,
  onSelectMedia,
  className = "",
  style,
  renderItem
}: InstagramGridProps): React.JSX.Element {
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  if (!media || media.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`instaconnect-empty ${className}`.trim()}
        style={{
          padding: "2.5rem",
          textAlign: "center",
          borderRadius: "12px",
          border: "1px dashed rgba(128,128,128,0.35)",
          color: "#6b7280",
          ...style
        }}
      >
        No Instagram media found.
      </div>
    );
  }

  const handleCycleCarousel = (
    e: React.MouseEvent | React.KeyboardEvent,
    item: InstagramMedia,
    delta: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const total = item.children.length;
    if (total <= 1) return;
    setCarouselIndices((prev) => {
      const current = prev[item.id] ?? 0;
      const next = (current + delta + total) % total;
      return { ...prev, [item.id]: next };
    });
  };

  return (
    <div
      role="list"
      aria-label="Instagram Media Grid"
      className={`instaconnect-grid ${className}`.trim()}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        width: "100%",
        ...style
      }}
    >
      {media.map((item) => {
        if (renderItem) {
          return (
            <div key={item.id} role="listitem">
              {renderItem(item)}
            </div>
          );
        }

        const activeChildIndex = carouselIndices[item.id] ?? 0;
        const activeChild =
          item.isCarousel && item.children.length > 0
            ? item.children[activeChildIndex]
            : undefined;
        const displayMediaType = activeChild ? activeChild.mediaType : item.mediaType;
        const displayUrl = activeChild
          ? activeChild.mediaUrl
          : item.mediaType === "VIDEO"
            ? item.thumbnailUrl ?? item.mediaUrl
            : item.mediaUrl;

        return (
          <article
            key={item.id}
            role="listitem"
            tabIndex={0}
            aria-label={
              item.caption
                ? `Instagram ${item.mediaType.toLowerCase()}: ${item.caption.slice(0, 80)}`
                : `Instagram ${item.mediaType.toLowerCase()} ${item.id}`
            }
            onClick={() => onSelectMedia?.(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                if (onSelectMedia) {
                  e.preventDefault();
                  onSelectMedia(item);
                }
              }
            }}
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              cursor: onSelectMedia ? "pointer" : "default"
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                backgroundColor: "#1f2937",
                overflow: "hidden"
              }}
            >
              {displayMediaType === "VIDEO" && !item.thumbnailUrl ? (
                <video
                  src={activeChild ? activeChild.mediaUrl : item.mediaUrl}
                  poster={item.thumbnailUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <img
                  src={displayUrl}
                  alt={item.caption ? item.caption.slice(0, 120) : `Instagram post ${item.id}`}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              )}

              {/* Media type badge */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "rgba(0,0,0,0.68)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.02em"
                }}
              >
                {item.isReel
                  ? "REEL"
                  : item.isCarousel
                    ? `CAROUSEL (${activeChildIndex + 1}/${ Math.max(item.children.length, 1)})`
                    : item.mediaType}
              </div>

              {/* Carousel navigation buttons */}
              {item.isCarousel && item.children.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous carousel item"
                    onClick={(e) => handleCycleCarousel(e, item, -1)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "8px",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "999px",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer"
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next carousel item"
                    onClick={(e) => handleCycleCarousel(e, item, 1)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "8px",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "999px",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer"
                    }}
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {showCaptions && (
              <div
                style={{
                  padding: "12px",
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: "#e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flexGrow: 1,
                  justifyContent: "space-between"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical"
                  }}
                >
                  {item.caption || "No caption"}
                </p>
                {item.permalink && (
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: "#f472b6",
                      fontSize: "12px",
                      textDecoration: "none",
                      fontWeight: 500
                    }}
                  >
                    View on Instagram ↗
                  </a>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

