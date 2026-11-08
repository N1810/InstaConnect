import { InstagramInsightsApi } from "./api/insights.js";
import { InstagramMediaApi } from "./api/media.js";
import { InstagramProfileApi } from "./api/profile.js";
import { InstagramStoriesApi } from "./api/stories.js";
import { InstagramOAuthService } from "./auth/oauth.js";
import { OAuthStateManager } from "./auth/state.js";
import { TokenManager } from "./auth/token-manager.js";
import { MemoryCacheAdapter, type CacheAdapter } from "./cache/index.js";
import { InstagramAuthError } from "./errors/index.js";
import { InstagramHttpClient } from "./http/index.js";
import type { InstagramClientConfig, InstagramTokenRecord } from "./types/index.js";
import { validateClientConfig } from "./utils/index.js";

/**
 * Primary SDK entry point for interacting with the official Meta Instagram API.
 *
 * Example:
 * ```ts
 * import { InstagramClient } from "@instaconnect/core";
 *
 * const instagram = new InstagramClient({
 *   appId: process.env.INSTAGRAM_APP_ID!,
 *   appSecret: process.env.INSTAGRAM_APP_SECRET!,
 *   redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
 * });
 * ```
 */
export class InstagramClient {
  public readonly auth: InstagramOAuthService;
  public readonly media: InstagramMediaApi;
  public readonly profile: InstagramProfileApi;
  public readonly insights: InstagramInsightsApi;
  public readonly stories: InstagramStoriesApi;
  public readonly cache: CacheAdapter;
  public readonly tokens: TokenManager;
  public readonly http: InstagramHttpClient;

  private readonly config: InstagramClientConfig;
  private defaultAccessToken?: string;
  private defaultAccountId: string;

  constructor(config: InstagramClientConfig) {
    validateClientConfig(config);
    this.config = { ...config };
    this.defaultAccessToken = config.accessToken;
    this.defaultAccountId = config.defaultAccountId ?? "default";

    const apiVersion = config.apiVersion ?? "v21.0";
    const cacheTtlSeconds = config.cacheTtlSeconds ?? 300;

    this.cache = config.cache ?? new MemoryCacheAdapter({ defaultTtlSeconds: cacheTtlSeconds });
    this.tokens = new TokenManager({ storage: config.tokenStorage });
    this.http = new InstagramHttpClient({
      fetchImplementation: config.fetchImplementation,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
      baseRetryDelayMs: config.baseRetryDelayMs
    });

    const stateManager = new OAuthStateManager({ secret: config.stateSecret });

    this.auth = new InstagramOAuthService({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri,
      apiVersion,
      http: this.http,
      stateManager,
      tokenManager: this.tokens
    });

    const resolveToken = (options?: { accountId?: string; accessToken?: string }) =>
      this.resolveValidAccessToken(options);

    this.media = new InstagramMediaApi({
      http: this.http,
      cache: this.cache,
      apiVersion,
      cacheTtlSeconds,
      resolveToken
    });

    this.profile = new InstagramProfileApi({
      http: this.http,
      cache: this.cache,
      apiVersion,
      cacheTtlSeconds,
      resolveToken
    });

    this.insights = new InstagramInsightsApi({
      http: this.http,
      apiVersion,
      resolveToken
    });

    this.stories = new InstagramStoriesApi({
      http: this.http,
      cache: this.cache,
      apiVersion,
      cacheTtlSeconds,
      resolveToken
    });
  }

  /**
   * Sets a runtime default access token or account ID on the client instance.
   */
  public setAccessToken(accessToken: string, accountId?: string): void {
    this.defaultAccessToken = accessToken;
    if (accountId) {
      this.defaultAccountId = accountId;
    }
  }

  /**
   * Resolves a valid access token from explicit parameter, token storage adapter (with proactive auto-refresh),
   * or client configuration.
   */
  public async resolveValidAccessToken(
    options: { accountId?: string; accessToken?: string } = {}
  ): Promise<string> {
    if (options.accessToken && options.accessToken.trim().length > 0) {
      return options.accessToken.trim();
    }

    const accountId = options.accountId ?? this.defaultAccountId;
    const storedRecord = await this.tokens.getToken(accountId);

    if (storedRecord) {
      if (this.tokens.isTokenExpired(storedRecord)) {
        throw new InstagramAuthError(
          `Instagram access token for account "${accountId}" has expired. Please re-authenticate via OAuth.`,
          { code: "INSTAGRAM_TOKEN_EXPIRED" }
        );
      }

      if (this.tokens.shouldRefreshToken(storedRecord)) {
        try {
          const refreshed: InstagramTokenRecord = await this.auth.refreshLongLivedToken(
            storedRecord.accessToken,
            storedRecord.userId
          );
          await this.tokens.saveToken(accountId, {
            ...refreshed,
            obtainedAt: storedRecord.obtainedAt,
            permissions: storedRecord.permissions
          });
          return refreshed.accessToken;
        } catch {
          // If proactive refresh fails transiently, still use current unexpired token
          return storedRecord.accessToken;
        }
      }

      return storedRecord.accessToken;
    }

    if (this.defaultAccessToken && this.defaultAccessToken.trim().length > 0) {
      return this.defaultAccessToken.trim();
    }

    throw new InstagramAuthError(
      "No Instagram access token available. Pass `accessToken` or authorize an account via OAuth first.",
      { code: "INSTAGRAM_TOKEN_MISSING" }
    );
  }

  /**
   * Returns non-sensitive configuration metadata for diagnostics.
   */
  public getClientMetadata(): {
    appId: string;
    redirectUri: string;
    apiVersion: string;
    defaultAccountId: string;
  } {
    return {
      appId: this.config.appId,
      redirectUri: this.config.redirectUri,
      apiVersion: this.config.apiVersion ?? "v21.0",
      defaultAccountId: this.defaultAccountId
    };
  }
}

