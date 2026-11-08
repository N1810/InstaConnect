# Security Audit & Performance Report

## 1. Security Architecture & Controls

| Control Area | Implementation | Status |
| --- | --- | --- |
| **Server-Only Credentials** | `appSecret` and `accessToken` reside strictly in `@instaconnect/core` and `@instaconnect/next/server`. Client hooks communicate via `/api/instagram/*` proxy routes. | Verified |
| **CSRF State Protection** | `OAuthStateManager` uses `crypto.randomBytes(24)` and HMAC-SHA256 signing with `crypto.timingSafeEqual` and `HttpOnly; SameSite=Lax` cookies. | Verified |
| **Token Redaction** | `sanitizeErrorMessage()` strips `access_token=`, `client_secret=`, and `IGQ*` / `IGA*` / `EAA*` bearer tokens from all error messages and logs. | Verified |
| **Redirect URI Validation** | `validateClientConfig()` enforces `https://` for all non-localhost redirect URIs. | Verified |
| **Graph ID & SSRF Validation** | `assertValidGraphId()` prevents path traversal in Graph endpoints; `isAllowedInstagramUrl()` restricts media domains to `*.cdninstagram.com` and `*.fbcdn.net`. | Verified |
| **Multi-Account Isolation** | `TokenStorageAdapter` keys all token records by `accountId` so multi-tenant apps never cross-contaminate tokens. | Verified |

### Token Encryption Guidance for Database Storage
When implementing a custom `TokenStorageAdapter` backed by PostgreSQL/MySQL/MongoDB, encrypt `token.accessToken` at rest using AES-256-GCM (`node:crypto` `createCipheriv("aes-256-gcm", key, iv)`) with a key stored in your KMS or environment secret manager.

---

## 2. Performance & Reliability Architecture

1. **In-Flight GET Request Deduplication**: `InstagramHttpClient` coalesces concurrent identical GET requests into a single network call.
2. **Configurable Caching (`MemoryCacheAdapter` & `RedisCacheAdapter`)**: Responses for `/me`, `/me/media`, `/media/{id}`, and `/children` are cached with configurable TTLs (default 300s) to stay well within Meta's hourly rate limits.
3. **Exponential Backoff with Jitter**: Transient 5xx errors and HTTP 429 rate-limit responses are retried using `baseDelay * 2^(attempt-1)` + 0–25% random jitter, respecting the `Retry-After` header when present.
4. **Zero-Retry on Permanent Errors**: OAuth 401/403 and validation errors fail fast immediately without wasting quota.

