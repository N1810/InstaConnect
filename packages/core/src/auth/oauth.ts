import { InstagramAuthError, InstagramValidationError } from "../errors/index.js";
import type { InstagramHttpClient } from "../http/index.js";
import type {
  AuthorizationUrlOptions,
  InstagramScope,
  InstagramTokenRecord
} from "../types/index.js";
import { OAuthStateManager } from "./state.js";
import { TokenManager } from "./token-manager.js";

const INSTAGRAM_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export const DEFAULT_INSTAGRAM_SCOPES: InstagramScope[] = [
  "instagram_business_basic",
  "instagram_business_manage_insights"
];

interface RawShortLivedTokenResponse {
  access_token?: string;
  user_id?: string | number;
  permissions?: string[];
  data?: Array<{
    access_token: string;
    user_id: string | number;
    permissions?: string | string[];
  }>;
}

interface RawLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Seconds (typically 5,184,000 = 60 days)
}

/**
 * Handles official Meta Instagram OAuth 2.0 flows:
 * 1. Authorization URL generation (`instagram_business_basic`, etc.)
 * 2. CSRF state validation
 * 3. Authorization code exchange for short-lived token
 * 4. Short-lived to Long-lived (60-day) token exchange (`ig_exchange_token`)
 * 5. Long-lived token refresh (`ig_refresh_token`)
 * 6. Account disconnect & permission revocation
 */
export class InstagramOAuthService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion: string;
  private readonly http: InstagramHttpClient;
  public readonly stateManager: OAuthStateManager;
  public readonly tokenManager: TokenManager;

  constructor(options: {
    appId: string;
    appSecret: string;
    redirectUri: string;
    apiVersion?: string;
    http: InstagramHttpClient;
    stateManager: OAuthStateManager;
    tokenManager: TokenManager;
  }) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.redirectUri = options.redirectUri;
    this.apiVersion = options.apiVersion ?? "v21.0";
    this.http = options.http;
    this.stateManager = options.stateManager;
    this.tokenManager = options.tokenManager;
  }

  /**
   * Builds the official Instagram OAuth authorization URL.
   */
  public getAuthorizationUrl(options: AuthorizationUrlOptions = {}): string {
    const scopes =
      options.scopes && options.scopes.length > 0 ? options.scopes : DEFAULT_INSTAGRAM_SCOPES;
    const state = options.state ?? this.stateManager.generateState();
    const redirectUri = options.redirectUri ?? this.redirectUri;

    const url = new URL(INSTAGRAM_AUTHORIZE_URL);
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(","));
    url.searchParams.set("state", state);

    if (options.enableFbLogin !== undefined) {
      url.searchParams.set("enable_fb_login", options.enableFbLogin ? "1" : "0");
    }
    if (options.forceAuthentication !== undefined) {
      url.searchParams.set("force_authentication", options.forceAuthentication ? "1" : "0");
    }

    return url.toString();
  }

  /**
   * Exchanges an authorization `code` returned to the callback URI for a short-lived Instagram User access token.
   * Automatically strips any trailing `#_` appended by Meta's OAuth redirect.
   */
  public async exchangeCodeForShortLivedToken(
    code: string,
    redirectUri?: string
  ): Promise<InstagramTokenRecord> {
    const sanitizedCode = code.replace(/#_$/, "").trim();
    if (!sanitizedCode) {
      throw new InstagramValidationError("Authorization `code` must not be empty.", {
        field: "code"
      });
    }

    const formData = new URLSearchParams();
    formData.set("client_id", this.appId);
    formData.set("client_secret", this.appSecret);
    formData.set("grant_type", "authorization_code");
    formData.set("redirect_uri", redirectUri ?? this.redirectUri);
    formData.set("code", sanitizedCode);

    const response = await this.http.request<RawShortLivedTokenResponse>(
      INSTAGRAM_SHORT_TOKEN_URL,
      {
        method: "POST",
        body: formData,
        deduplicate: false,
        maxRetries: 1
      }
    );

    const firstDataItem = response.data?.[0];
    const accessToken = response.access_token ?? firstDataItem?.access_token;
    const rawUserId = response.user_id ?? firstDataItem?.user_id;

    if (!accessToken || !rawUserId) {
      throw new InstagramAuthError(
        "Instagram OAuth token exchange succeeded but did not return an access_token and user_id.",
        { code: "INVALID_TOKEN_EXCHANGE_RESPONSE" }
      );
    }

    let permissions: string[] | undefined;
    if (Array.isArray(response.permissions)) {
      permissions = response.permissions;
    } else if (typeof firstDataItem?.permissions === "string") {
      permissions = firstDataItem.permissions.split(",").map((s) => s.trim());
    } else if (Array.isArray(firstDataItem?.permissions)) {
      permissions = firstDataItem.permissions;
    }

    const now = Date.now();
    // Short-lived tokens are valid for 1 hour (3600 seconds)
    return {
      accessToken,
      userId: String(rawUserId),
      tokenType: "short_lived",
      expiresAt: now + 3600 * 1000,
      permissions,
      obtainedAt: now,
      updatedAt: now
    };
  }

  /**
   * Exchanges a valid short-lived Instagram User access token for a 60-day long-lived token.
   */
  public async exchangeForLongLivedToken(
    shortLivedToken: string,
    userId = "default"
  ): Promise<InstagramTokenRecord> {
    if (!shortLivedToken || typeof shortLivedToken !== "string") {
      throw new InstagramValidationError("`shortLivedToken` is required.", {
        field: "shortLivedToken"
      });
    }

    const response = await this.http.request<RawLongLivedTokenResponse>(
      `${INSTAGRAM_GRAPH_BASE_URL}/access_token`,
      {
        method: "GET",
        query: {
          grant_type: "ig_exchange_token",
          client_secret: this.appSecret,
          access_token: shortLivedToken
        },
        deduplicate: false
      }
    );

    if (!response.access_token) {
      throw new InstagramAuthError("Failed to exchange short-lived token for long-lived token.");
    }

    const now = Date.now();
    const expiresInSeconds = response.expires_in ?? 5_184_000; // Default 60 days

    return {
      accessToken: response.access_token,
      userId,
      tokenType: "long_lived",
      expiresAt: now + expiresInSeconds * 1000,
      obtainedAt: now,
      updatedAt: now
    };
  }

  /**
   * Refreshes an existing unexpired long-lived token for another 60 days.
   * Short-lived tokens cannot be refreshed directly and must be exchanged via `exchangeForLongLivedToken`.
   */
  public async refreshLongLivedToken(
    longLivedToken: string,
    userId = "default"
  ): Promise<InstagramTokenRecord> {
    if (!longLivedToken || typeof longLivedToken !== "string") {
      throw new InstagramValidationError("`longLivedToken` is required for refresh.", {
        field: "longLivedToken"
      });
    }

    const response = await this.http.request<RawLongLivedTokenResponse>(
      `${INSTAGRAM_GRAPH_BASE_URL}/refresh_access_token`,
      {
        method: "GET",
        query: {
          grant_type: "ig_refresh_token",
          access_token: longLivedToken
        },
        deduplicate: false
      }
    );

    if (!response.access_token) {
      throw new InstagramAuthError("Failed to refresh long-lived Instagram token.");
    }

    const now = Date.now();
    const expiresInSeconds = response.expires_in ?? 5_184_000;

    return {
      accessToken: response.access_token,
      userId,
      tokenType: "long_lived",
      expiresAt: now + expiresInSeconds * 1000,
      obtainedAt: now,
      updatedAt: now
    };
  }

  /**
   * Full OAuth callback workflow:
   * 1. Validates CSRF state parameter (if provided/expected)
   * 2. Exchanges authorization code for short-lived token
   * 3. Upgrades short-lived token to a 60-day long-lived token
   * 4. Persists the token in the configured `TokenStorageAdapter`
   */
  public async handleCallback(params: {
    code: string;
    state?: string | null;
    expectedState?: string;
    upgradeToLongLived?: boolean;
    persistAccountId?: string;
  }): Promise<InstagramTokenRecord> {
    if (params.state !== undefined || params.expectedState !== undefined) {
      this.stateManager.validateState(params.state, params.expectedState);
    }

    const shortLived = await this.exchangeCodeForShortLivedToken(params.code);
    let finalToken = shortLived;

    if (params.upgradeToLongLived ?? true) {
      const longLived = await this.exchangeForLongLivedToken(
        shortLived.accessToken,
        shortLived.userId
      );
      finalToken = {
        ...longLived,
        permissions: shortLived.permissions,
        obtainedAt: shortLived.obtainedAt
      };
    }

    const storageKey = params.persistAccountId ?? finalToken.userId;
    await this.tokenManager.saveToken(storageKey, finalToken);

    return finalToken;
  }

  /**
   * Revokes permissions on Meta Graph API (where supported) and removes the stored token locally.
   */
  public async disconnect(options: {
    accountId?: string;
    accessToken?: string;
    revokeOnMeta?: boolean;
  }): Promise<{ disconnected: boolean; revokedRemote: boolean }> {
    const accountId = options.accountId ?? "default";
    const stored = await this.tokenManager.getToken(accountId);
    const tokenToRevoke = options.accessToken ?? stored?.accessToken;

    let revokedRemote = false;
    if ((options.revokeOnMeta ?? true) && tokenToRevoke) {
      try {
        await this.http.request(`${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me/permissions`, {
          method: "DELETE",
          query: {
            access_token: tokenToRevoke
          },
          maxRetries: 0
        });
        revokedRemote = true;
      } catch {
        // Even if remote revocation fails (e.g. token already expired), always delete local credentials
        revokedRemote = false;
      }
    }

    await this.tokenManager.deleteToken(accountId);
    return { disconnected: true, revokedRemote };
  }
}

