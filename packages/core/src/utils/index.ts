import { InstagramValidationError } from "../errors/index.js";
import type { InstagramClientConfig } from "../types/index.js";

/**
 * Allowed domains for official Meta Instagram media and CDN assets to prevent SSRF.
 */
const ALLOWED_INSTAGRAM_MEDIA_HOST_PATTERNS = [
  /^([a-z0-9-]+\.)*cdninstagram\.com$/i,
  /^([a-z0-9-]+\.)*fbcdn\.net$/i,
  /^([a-z0-9-]+\.)*instagram\.com$/i
];

/**
 * Validates `InstagramClientConfig` on initialization.
 */
export function validateClientConfig(config: InstagramClientConfig): void {
  if (!config || typeof config !== "object") {
    throw new InstagramValidationError("InstagramClient configuration object is required.");
  }

  if (!config.appId || typeof config.appId !== "string" || config.appId.trim().length === 0) {
    throw new InstagramValidationError("`appId` is required and must be a non-empty string.", {
      field: "appId"
    });
  }

  if (
    !config.appSecret ||
    typeof config.appSecret !== "string" ||
    config.appSecret.trim().length === 0
  ) {
    throw new InstagramValidationError("`appSecret` is required and must be a non-empty string.", {
      field: "appSecret"
    });
  }

  if (
    !config.redirectUri ||
    typeof config.redirectUri !== "string" ||
    config.redirectUri.trim().length === 0
  ) {
    throw new InstagramValidationError(
      "`redirectUri` is required and must be a valid HTTPS or localhost URL.",
      { field: "redirectUri" }
    );
  }

  try {
    const parsed = new URL(config.redirectUri);
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]";
    if (parsed.protocol !== "https:" && !(isLocalhost && parsed.protocol === "http:")) {
      throw new InstagramValidationError(
        "`redirectUri` must use HTTPS in production (HTTP is only allowed for localhost).",
        { field: "redirectUri" }
      );
    }
  } catch (err) {
    if (err instanceof InstagramValidationError) {
      throw err;
    }
    throw new InstagramValidationError("`redirectUri` must be a valid URL.", {
      field: "redirectUri",
      cause: err
    });
  }
}

/**
 * Validates that an external URL belongs to an official Meta / Instagram CDN domain (SSRF protection).
 */
export function isAllowedInstagramUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return ALLOWED_INSTAGRAM_MEDIA_HOST_PATTERNS.some((regex) => regex.test(parsed.hostname));
  } catch {
    return false;
  }
}

/**
 * Validates that a media or account ID only contains safe characters (digits/alphanumerics/underscores)
 * to prevent path traversal or injection in Graph API URLs.
 */
export function assertValidGraphId(id: string, fieldName = "id"): string {
  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(id.trim())) {
    throw new InstagramValidationError(
      `Invalid Instagram Graph ID provided for \`${fieldName}\`.`,
      { field: fieldName }
    );
  }
  return id.trim();
}

