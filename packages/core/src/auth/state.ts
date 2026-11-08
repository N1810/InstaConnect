import crypto from "node:crypto";
import { InstagramAuthError } from "../errors/index.js";

export interface StatePayload {
  nonce: string;
  issuedAt: number;
  metadata?: Record<string, string>;
}

/**
 * Generates a cryptographically secure random state parameter or HMAC-signed state token
 * to protect Instagram OAuth callbacks against CSRF attacks.
 */
export class OAuthStateManager {
  private readonly secret?: string;
  private readonly maxAgeMs: number;

  constructor(options: { secret?: string; maxAgeSeconds?: number } = {}) {
    this.secret = options.secret;
    this.maxAgeMs = (options.maxAgeSeconds ?? 600) * 1000; // Default 10 minutes
  }

  /**
   * Generates a URL-safe state string. If a secret is configured, signs the state with HMAC-SHA256.
   */
  public generateState(metadata?: Record<string, string>): string {
    const nonce = crypto.randomBytes(24).toString("base64url");
    if (!this.secret) {
      return nonce;
    }

    const payload: StatePayload = {
      nonce,
      issuedAt: Date.now(),
      ...(metadata ? { metadata } : {})
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Validates that the returned `receivedState` from Instagram callback matches `expectedState`
   * using timing-safe comparison, and checks HMAC signature + expiration if signed.
   */
  public validateState(receivedState: string | null | undefined, expectedState?: string): StatePayload | null {
    if (!receivedState || typeof receivedState !== "string" || receivedState.trim().length === 0) {
      throw new InstagramAuthError("Missing OAuth `state` parameter in callback.", {
        code: "OAUTH_STATE_MISSING",
        statusCode: 400
      });
    }

    if (expectedState !== undefined) {
      const receivedBuf = Buffer.from(receivedState, "utf8");
      const expectedBuf = Buffer.from(expectedState, "utf8");
      if (
        receivedBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(receivedBuf, expectedBuf)
      ) {
        throw new InstagramAuthError("OAuth `state` mismatch. Potential CSRF attack detected.", {
          code: "OAUTH_STATE_MISMATCH",
          statusCode: 403
        });
      }
    }

    if (!this.secret) {
      return { nonce: receivedState, issuedAt: Date.now() };
    }

    const parts = receivedState.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new InstagramAuthError("Malformed signed OAuth `state` token.", {
        code: "OAUTH_STATE_MALFORMED",
        statusCode: 400
      });
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = this.sign(encodedPayload);

    const sigBuf = Buffer.from(signature, "utf8");
    const expectedSigBuf = Buffer.from(expectedSignature, "utf8");
    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      throw new InstagramAuthError("Invalid OAuth `state` HMAC signature.", {
        code: "OAUTH_STATE_INVALID_SIGNATURE",
        statusCode: 403
      });
    }

    let parsed: StatePayload;
    try {
      parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as StatePayload;
    } catch (err) {
      throw new InstagramAuthError("Failed to decode OAuth `state` payload.", {
        code: "OAUTH_STATE_DECODE_ERROR",
        statusCode: 400,
        cause: err
      });
    }

    if (!parsed.issuedAt || Date.now() - parsed.issuedAt > this.maxAgeMs) {
      throw new InstagramAuthError("OAuth `state` token has expired.", {
        code: "OAUTH_STATE_EXPIRED",
        statusCode: 400
      });
    }

    return parsed;
  }

  private sign(data: string): string {
    if (!this.secret) {
      throw new Error("State secret is not configured.");
    }
    return crypto.createHmac("sha256", this.secret).update(data).digest("base64url");
  }
}

