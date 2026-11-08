import type { InstagramTokenRecord } from "../types/index.js";

/**
 * Storage adapter interface for persisting Instagram OAuth tokens across requests.
 * Supports multi-account isolation via `accountId` (e.g., Instagram User ID or tenant ID).
 */
export interface TokenStorageAdapter {
  getToken(accountId: string): Promise<InstagramTokenRecord | null>;
  saveToken(accountId: string, token: InstagramTokenRecord): Promise<void>;
  deleteToken(accountId: string): Promise<void>;
  listAccounts?(): Promise<string[]>;
}

/**
 * In-memory token storage adapter for development and testing.
 */
export class MemoryTokenStorageAdapter implements TokenStorageAdapter {
  private readonly tokens = new Map<string, InstagramTokenRecord>();

  public async getToken(accountId: string): Promise<InstagramTokenRecord | null> {
    const record = this.tokens.get(accountId);
    return record ? { ...record } : null;
  }

  public async saveToken(accountId: string, token: InstagramTokenRecord): Promise<void> {
    this.tokens.set(accountId, { ...token });
  }

  public async deleteToken(accountId: string): Promise<void> {
    this.tokens.delete(accountId);
  }

  public async listAccounts(): Promise<string[]> {
    return Array.from(this.tokens.keys());
  }
}

/**
 * Token lifecycle manager that handles token storage, expiration checks, and automatic proactive refresh
 * before expiration (when a long-lived token is within the refresh window).
 */
export class TokenManager {
  private readonly storage: TokenStorageAdapter;
  private readonly refreshThresholdMs: number;
  private readonly minTokenAgeForRefreshMs: number;

  constructor(
    options: {
      storage?: TokenStorageAdapter;
      /**
       * Refresh long-lived tokens when they have less than this many seconds remaining.
       * Default: 7 days (604,800 seconds).
       */
      refreshThresholdSeconds?: number;
    } = {}
  ) {
    this.storage = options.storage ?? new MemoryTokenStorageAdapter();
    this.refreshThresholdMs = (options.refreshThresholdSeconds ?? 7 * 24 * 60 * 60) * 1000;
    // Meta requires long-lived tokens to be at least 24 hours old before refreshing
    this.minTokenAgeForRefreshMs = 24 * 60 * 60 * 1000;
  }

  public getStorage(): TokenStorageAdapter {
    return this.storage;
  }

  public async getToken(accountId: string): Promise<InstagramTokenRecord | null> {
    return this.storage.getToken(accountId);
  }

  public async saveToken(accountId: string, token: InstagramTokenRecord): Promise<void> {
    await this.storage.saveToken(accountId, token);
  }

  public async deleteToken(accountId: string): Promise<void> {
    await this.storage.deleteToken(accountId);
  }

  /**
   * Checks whether a token record is already expired.
   */
  public isTokenExpired(token: InstagramTokenRecord, nowMs = Date.now()): boolean {
    if (!token.expiresAt) {
      return false;
    }
    return nowMs >= token.expiresAt;
  }

  /**
   * Determines whether a token is eligible and due for proactive refresh.
   * Note: According to Meta documentation:
   * - Only `long_lived` tokens support `ig_refresh_token`.
   * - Short-lived tokens must first be exchanged via `ig_exchange_token`.
   * - Long-lived tokens must be at least 24 hours old and not yet expired.
   */
  public shouldRefreshToken(token: InstagramTokenRecord, nowMs = Date.now()): boolean {
    if (token.tokenType !== "long_lived") {
      return false;
    }
    if (this.isTokenExpired(token, nowMs)) {
      return false;
    }
    const tokenAge = nowMs - token.updatedAt;
    if (tokenAge < this.minTokenAgeForRefreshMs) {
      return false;
    }
    if (!token.expiresAt) {
      return false;
    }
    const remainingMs = token.expiresAt - nowMs;
    return remainingMs <= this.refreshThresholdMs;
  }
}

