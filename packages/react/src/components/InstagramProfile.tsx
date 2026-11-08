import React from "react";
import { useInstagramProfile } from "../hooks/index.js";
import type { InstagramProfileProps } from "../types/index.js";

/**
 * Displays Instagram Professional Account profile information (Avatar, Username, Account Type, Media Count, Bio).
 */
export function InstagramProfile({
  profile: externalProfile,
  accountId,
  apiBasePath,
  showAvatar = true,
  showUsername = true,
  showMediaCount = true,
  showBio = true,
  className = "",
  style
}: InstagramProfileProps): React.JSX.Element {
  const { profile: fetchedProfile, loading, error } = useInstagramProfile({
    accountId,
    apiBasePath,
    enabled: externalProfile === undefined
  });

  const profile = externalProfile !== undefined ? externalProfile : fetchedProfile;

  if (loading && !profile) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading Instagram profile"
        className={`instaconnect-profile-skeleton ${className}`.trim()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px",
          borderRadius: "12px",
          backgroundColor: "rgba(156, 163, 175, 0.12)",
          ...style
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "999px",
            backgroundColor: "rgba(156, 163, 175, 0.25)"
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "140px",
              height: "18px",
              borderRadius: "4px",
              backgroundColor: "rgba(156, 163, 175, 0.25)",
              marginBottom: "8px"
            }}
          />
          <div
            style={{
              width: "90px",
              height: "14px",
              borderRadius: "4px",
              backgroundColor: "rgba(156, 163, 175, 0.2)"
            }}
          />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        role="alert"
        className={`instaconnect-profile-error ${className}`.trim()}
        style={{
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          color: "#ef4444",
          ...style
        }}
      >
        {error ? `Failed to load profile: ${error.message}` : "No Instagram profile connected."}
      </div>
    );
  }

  return (
    <section
      aria-label={`Instagram profile for @${profile.username}`}
      className={`instaconnect-profile ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "18px",
        padding: "20px",
        borderRadius: "14px",
        backgroundColor: "#111827",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#f9fafb",
        ...style
      }}
    >
      {showAvatar && (
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)",
            padding: "2px",
            flexShrink: 0
          }}
        >
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt={`@${profile.username} avatar`}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "999px",
                objectFit: "cover",
                backgroundColor: "#111827"
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "999px",
                backgroundColor: "#1f2937",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "22px",
                color: "#f472b6"
              }}
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {showUsername && (
            <strong style={{ fontSize: "18px", fontWeight: 700 }}>@{profile.username}</strong>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "999px",
              backgroundColor: "rgba(236, 72, 153, 0.15)",
              color: "#f472b6"
            }}
          >
            {profile.accountType}
          </span>
        </div>

        {showMediaCount && (
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#9ca3af" }}>
            <span>
              <strong style={{ color: "#f9fafb" }}>{profile.mediaCount}</strong> posts
            </span>
            {typeof profile.followersCount === "number" && (
              <span>
                <strong style={{ color: "#f9fafb" }}>{profile.followersCount}</strong> followers
              </span>
            )}
          </div>
        )}

        {showBio && profile.biography && (
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#d1d5db", lineHeight: 1.4 }}>
            {profile.biography}
          </p>
        )}
      </div>
    </section>
  );
}

