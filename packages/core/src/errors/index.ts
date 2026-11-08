/**
 * Base error class for all InstaConnect SDK errors.
 * Ensures sensitive values like access tokens and app secrets are never included in error serialization.
 */
export class InstaConnectError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(sanitizeErrorMessage(message), options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code ?? "INSTACONNECT_ERROR";
    this.statusCode = options.statusCode ?? 500;
    this.isRetryable = options.isRetryable ?? false;
    this.details = options.details ? sanitizeDetails(options.details) : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      ...(this.details ? { details: this.details } : {})
    };
  }
}

/**
 * Thrown when OAuth authorization, state validation, or token operations fail.
 */
export class InstagramAuthError extends InstaConnectError {
  public readonly oauthErrorCode?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      oauthErrorCode?: string;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: options.code ?? "INSTAGRAM_AUTH_ERROR",
      statusCode: options.statusCode ?? 401,
      isRetryable: false,
      cause: options.cause,
      details: options.details
    });
    this.oauthErrorCode = options.oauthErrorCode;
  }
}

/**
 * Thrown when the Meta Graph API returns a rate-limit response (HTTP 429 or OAuthException codes 4, 17, 32, 613).
 */
export class InstagramRateLimitError extends InstaConnectError {
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: {
      retryAfterMs?: number;
      statusCode?: number;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: "INSTAGRAM_RATE_LIMIT_ERROR",
      statusCode: options.statusCode ?? 429,
      isRetryable: true,
      cause: options.cause,
      details: options.details
    });
    this.retryAfterMs = options.retryAfterMs;
  }
}

/**
 * Thrown when the Meta Graph API returns an application or Graph-level error.
 */
export class InstagramApiError extends InstaConnectError {
  public readonly fbTraceId?: string;
  public readonly graphErrorCode?: number;
  public readonly graphErrorSubcode?: number;
  public readonly graphErrorType?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      fbTraceId?: string;
      graphErrorCode?: number;
      graphErrorSubcode?: number;
      graphErrorType?: string;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: options.code ?? "INSTAGRAM_API_ERROR",
      statusCode: options.statusCode ?? 400,
      isRetryable: options.isRetryable ?? false,
      cause: options.cause,
      details: options.details
    });
    this.fbTraceId = options.fbTraceId;
    this.graphErrorCode = options.graphErrorCode;
    this.graphErrorSubcode = options.graphErrorSubcode;
    this.graphErrorType = options.graphErrorType;
  }
}

/**
 * Thrown when configuration, parameters, or API payloads fail validation.
 */
export class InstagramValidationError extends InstaConnectError {
  public readonly field?: string;

  constructor(
    message: string,
    options: {
      field?: string;
      details?: Record<string, unknown>;
      cause?: unknown;
    } = {}
  ) {
    super(message, {
      code: "INSTAGRAM_VALIDATION_ERROR",
      statusCode: 400,
      isRetryable: false,
      cause: options.cause,
      details: options.details
    });
    this.field = options.field;
  }
}

/**
 * Thrown when an API request exceeds the configured timeout or fails due to transient network issues.
 */
export class InstagramNetworkError extends InstaConnectError {
  constructor(
    message: string,
    options: {
      isTimeout?: boolean;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: options.isTimeout ? "INSTAGRAM_TIMEOUT_ERROR" : "INSTAGRAM_NETWORK_ERROR",
      statusCode: options.isTimeout ? 504 : 503,
      isRetryable: true,
      cause: options.cause,
      details: options.details
    });
  }
}

const SENSITIVE_PATTERNS = [
  /access_token=([^&\s]+)/gi,
  /client_secret=([^&\s]+)/gi,
  /IGQ[A-Za-z0-9_-]{20,}/g,
  /IGA[A-Za-z0-9_-]{20,}/g,
  /EAA[A-Za-z0-9_-]{20,}/g
];

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.startsWith("access_token=")) return "access_token=[REDACTED]";
      if (match.startsWith("client_secret=")) return "client_secret=[REDACTED]";
      return "[REDACTED_TOKEN]";
    });
  }
  return sanitized;
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    "access_token",
    "accessToken",
    "appSecret",
    "client_secret",
    "clientSecret",
    "secret",
    "authorization"
  ]);
  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.has(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      result[key] = sanitizeErrorMessage(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

