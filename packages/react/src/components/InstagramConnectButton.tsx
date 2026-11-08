import React, { useState } from "react";
import { useInstagramConfig } from "../context/index.js";
import type { InstagramConnectButtonProps } from "../types/index.js";

/**
 * Accessible OAuth Connect button that initiates the server-side Instagram Login handshake.
 */
export function InstagramConnectButton({
  connectUrl,
  label = "Connect Instagram Account",
  connectingLabel = "Redirecting to Instagram...",
  onConnect,
  onError,
  className = "",
  style,
  disabled = false
}: InstagramConnectButtonProps): React.JSX.Element {
  const config = useInstagramConfig();
  const [connecting, setConnecting] = useState(false);

  const targetUrl = connectUrl ?? `${config.apiBasePath}/connect`;

  const handleClick = () => {
    try {
      setConnecting(true);
      onConnect?.();
      if (typeof window !== "undefined") {
        window.location.assign(targetUrl);
      }
    } catch (err) {
      setConnecting(false);
      onError?.(err instanceof Error ? err : new Error("Failed to initiate Instagram connection"));
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || connecting}
      onClick={handleClick}
      className={`instaconnect-connect-button ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "11px 22px",
        borderRadius: "10px",
        border: "none",
        background: "linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)",
        color: "#ffffff",
        fontWeight: 600,
        fontSize: "14px",
        cursor: disabled || connecting ? "not-allowed" : "pointer",
        opacity: disabled || connecting ? 0.7 : 1,
        ...style
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
      <span>{connecting ? connectingLabel : label}</span>
    </button>
  );
}

