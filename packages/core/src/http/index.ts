import {
  InstaConnectError,
  InstagramApiError,
  InstagramAuthError,
  InstagramNetworkError,
  InstagramRateLimitError
} from "../errors/index.js";

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "DELETE";
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: URLSearchParams | Record<string, unknown> | string;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  deduplicate?: boolean;
}

interface MetaGraphErrorEnvelope {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  error_type?: string;
  code?: number;
  error_message?: string;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const AUTH_ERROR_CODES = new Set([102, 190, 10, 200]);

/**
 * Enterprise HTTP client for Meta Instagram Graph & OAuth APIs.
 * Features:
 * - Automatic query parameter serialization
 * - Request timeout with AbortController
 * - Concurrent GET request deduplication
 * - Rate-limit detection (HTTP 429 & Graph error codes 4, 17, 32, 613)
 * - Exponential backoff with jitter for transient 5xx / network / rate-limit errors
 * - Strict no-retry policy for permanent authentication, permission, or validation failures
 */
export class InstagramHttpClient {
  private readonly fetchFn: typeof fetch;
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxRetries: number;
  private readonly defaultBaseRetryDelayMs: number;
  private readonly inflightRequests = new Map<string, Promise<unknown>>();

  constructor(
    options: {
      fetchImplementation?: typeof fetch;
      timeoutMs?: number;
      maxRetries?: number;
      baseRetryDelayMs?: number;
    } = {}
  ) {
    this.fetchFn = options.fetchImplementation ?? globalThis.fetch.bind(globalThis);
    this.defaultTimeoutMs = options.timeoutMs ?? 15_000;
    this.defaultMaxRetries = options.maxRetries ?? 3;
    this.defaultBaseRetryDelayMs = options.baseRetryDelayMs ?? 500;
  }

  public async request<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const fullUrl = this.buildUrl(url, options.query);
    const shouldDeduplicate = (options.deduplicate ?? true) && method === "GET";

    if (shouldDeduplicate) {
      const existing = this.inflightRequests.get(fullUrl);
      if (existing) {
        return existing as Promise<T>;
      }
    }

    const executionPromise = this.executeWithRetry<T>(fullUrl, method, options);

    if (shouldDeduplicate) {
      this.inflightRequests.set(fullUrl, executionPromise);
      executionPromise.finally(() => {
        this.inflightRequests.delete(fullUrl);
      }).catch(() => {
        // Handled by caller
      });
    }

    return executionPromise;
  }

  private buildUrl(
    baseUrl: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    if (!query) {
      return baseUrl;
    }
    const urlObj = new URL(baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        urlObj.searchParams.set(key, String(value));
      }
    }
    return urlObj.toString();
  }

  private async executeWithRetry<T>(
    url: string,
    method: "GET" | "POST" | "DELETE",
    options: HttpRequestOptions
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    const baseDelay = options.baseRetryDelayMs ?? this.defaultBaseRetryDelayMs;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    let attempt = 0;

    while (true) {
      try {
        return await this.performSingleRequest<T>(url, method, timeoutMs, options);
      } catch (error) {
        const normalizedError = this.normalizeError(error);

        if (!normalizedError.isRetryable || attempt >= maxRetries) {
          throw normalizedError;
        }

        attempt += 1;
        let delayMs = baseDelay * Math.pow(2, attempt - 1);
        // Add 0-25% jitter
        delayMs += Math.floor(Math.random() * (delayMs * 0.25));

        if (
          normalizedError instanceof InstagramRateLimitError &&
          normalizedError.retryAfterMs !== undefined
        ) {
          delayMs = Math.max(delayMs, normalizedError.retryAfterMs);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async performSingleRequest<T>(
    url: string,
    method: "GET" | "POST" | "DELETE",
    timeoutMs: number,
    options: HttpRequestOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...options.headers
      };

      let bodyPayload: BodyInit | undefined;
      if (options.body instanceof URLSearchParams) {
        headers["Content-Type"] =
          headers["Content-Type"] ?? "application/x-www-form-urlencoded;charset=UTF-8";
        bodyPayload = options.body.toString();
      } else if (typeof options.body === "string") {
        bodyPayload = options.body;
      } else if (options.body && typeof options.body === "object") {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        bodyPayload = JSON.stringify(options.body);
      }

      const response = await this.fetchFn(url, {
        method,
        headers,
        body: bodyPayload,
        signal: controller.signal
      });

      const rawText = await response.text();
      let parsedBody: unknown = {};
      if (rawText.trim().length > 0) {
        try {
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = { raw: rawText };
        }
      }

      if (!response.ok) {
        throw this.createHttpError(response, parsedBody as MetaGraphErrorEnvelope);
      }

      return parsedBody as T;
    } catch (error) {
      if (error instanceof InstaConnectError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new InstagramNetworkError(`Instagram API request timed out after ${timeoutMs}ms.`, {
          isTimeout: true,
          cause: error
        });
      }
      throw new InstagramNetworkError(
        error instanceof Error ? error.message : "Network request to Instagram API failed.",
        { cause: error }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createHttpError(response: Response, payload: MetaGraphErrorEnvelope): InstaConnectError {
    const status = response.status;
    const graphError = payload?.error;
    const code = graphError?.code ?? payload?.code;
    const subcode = graphError?.error_subcode;
    const errorType = graphError?.type ?? payload?.error_type;
    const message =
      graphError?.message ??
      payload?.error_message ??
      `Instagram API request failed with HTTP status ${status}.`;
    const fbTraceId = graphError?.fbtrace_id;

    // Rate Limit check
    if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
      return new InstagramRateLimitError(message, {
        statusCode: status,
        retryAfterMs: Number.isFinite(retryAfterSec) ? retryAfterSec * 1000 : undefined,
        details: {
          graphErrorCode: code,
          fbTraceId
        }
      });
    }

    // Auth / Permission check (Never retry)
    if (
      status === 401 ||
      status === 403 ||
      errorType === "OAuthException" ||
      (code !== undefined && AUTH_ERROR_CODES.has(code))
    ) {
      return new InstagramAuthError(message, {
        statusCode: status === 200 ? 401 : status,
        oauthErrorCode: code !== undefined ? String(code) : errorType,
        details: {
          graphErrorCode: code,
          graphErrorSubcode: subcode,
          fbTraceId
        }
      });
    }

    // Server 5xx errors are retryable
    const isRetryable = status >= 500 && status < 600;

    return new InstagramApiError(message, {
      statusCode: status,
      isRetryable,
      fbTraceId,
      graphErrorCode: code,
      graphErrorSubcode: subcode,
      graphErrorType: errorType
    });
  }

  private normalizeError(error: unknown): InstaConnectError {
    if (error instanceof InstaConnectError) {
      return error;
    }
    return new InstagramNetworkError(
      error instanceof Error ? error.message : "Unknown network error",
      { cause: error }
    );
  }
}

