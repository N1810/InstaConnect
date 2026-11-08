# InstaConnect Complete Developer Documentation

## Table of Contents

1. [Introduction](#1-introduction)
2. [Installation](#2-installation)
3. [Meta Developer App Setup](#3-meta-developer-app-setup)
4. [Instagram Login Configuration](#4-instagram-login-configuration)
5. [Required Permissions](#5-required-permissions)
6. [OAuth Setup](#6-oauth-setup)
7. [Token Management](#7-token-management)
8. [Fetching Posts](#8-fetching-posts)
9. [Fetching Reels](#9-fetching-reels)
10. [Fetching Carousel Posts](#10-fetching-carousel-posts)
11. [Displaying Instagram Feeds](#11-displaying-instagram-feeds)
12. [Using React Hooks](#12-using-react-hooks)
13. [Custom UI Implementation](#13-custom-ui-implementation)
14. [Caching](#14-caching)
15. [Error Handling](#15-error-handling)
16. [Deployment](#16-deployment)
17. [Troubleshooting](#17-troubleshooting)
18. [API Reference](#18-api-reference)
19. [Meta API Limitations](#19-meta-api-limitations)

---

## 1. Introduction

**InstaConnect** is an official Meta API-compliant SDK for connecting Instagram Professional accounts (Business and Creator) to TypeScript, React, and Next.js applications. It uses zero scraping or unofficial endpoints.

## 2. Installation

```bash
pnpm add @instaconnect/core @instaconnect/react @instaconnect/next
```

## 3. Meta Developer App Setup

1. Sign in to [developers.facebook.com](https://developers.facebook.com/).
2. Create a new **Business** app.
3. Add the **Instagram** product and select **API setup with Instagram login**.
4. Copy your **Instagram App ID** and **Instagram App Secret** from the dashboard.

## 4. Instagram Login Configuration

Configure your **Valid OAuth Redirect URIs**:
- Local development: `http://localhost:3000/api/instagram/callback`
- Production: `https://yourdomain.com/api/instagram/callback`

## 5. Required Permissions

- `instagram_business_basic`: Required for reading profile metadata, posts, Reels, and carousels.
- `instagram_business_manage_insights`: Required when using `instagram.insights` metrics.

## 6. OAuth Setup

```ts
import { InstagramClient } from "@instaconnect/core";

const instagram = new InstagramClient({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
  stateSecret: process.env.INSTACONNECT_STATE_SECRET,
});

// Generate state + URL
const state = instagram.auth.stateManager.generateState();
const url = instagram.auth.getAuthorizationUrl({ state });
```

## 7. Token Management

Meta issues a 1-hour short-lived token upon code exchange. `instagram.auth.handleCallback()` automatically exchanges it for a **60-day long-lived token** via `ig_exchange_token` and stores it in your `TokenStorageAdapter`. When a long-lived token is within 7 days of expiration (and at least 24 hours old), `InstagramClient` proactively refreshes it via `ig_refresh_token`.

## 8. Fetching Posts

```ts
const response = await instagram.media.list({
  limit: 12,
  after: cursor,
});
console.log(response.data);
console.log(response.paging.cursors?.after);
```

## 9. Fetching Reels

```ts
const reels = await instagram.media.listReels({ limit: 6 });
```

## 10. Fetching Carousel Posts

Carousel albums (`mediaType === "CAROUSEL_ALBUM"`) automatically include normalized `children` in `instagram.media.list()`. You can also query child items explicitly:

```ts
const children = await instagram.media.getChildren(mediaId);
```

## 11. Displaying Instagram Feeds

```tsx
import { InstagramFeed } from "@instaconnect/react";

<InstagramFeed
  limit={12}
  layout="grid"
  columns={3}
  showCaptions
  showReels
  showLoadMore
/>
```

## 12. Using React Hooks

```tsx
import {
  useInstagramFeed,
  useInstagramProfile,
  useInstagramMedia,
  useInstagramReels,
  useInstagramConnection,
} from "@instaconnect/react";

const { media, loading, error, hasMore, loadMore, refresh } = useInstagramFeed({ limit: 12 });
```

## 13. Custom UI Implementation

Use `<InstagramGrid renderItem={(item) => <MyCustomCard item={item} />} media={media} />` or `useInstagramFeed()` to build bespoke layouts.

## 14. Caching

Pass `MemoryCacheAdapter` (default) or `RedisCacheAdapter` to `InstagramClient`:

```ts
import { InstagramClient, RedisCacheAdapter } from "@instaconnect/core";

const instagram = new InstagramClient({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
  cache: new RedisCacheAdapter(redisClient, { defaultTtlSeconds: 300 }),
});
```

## 15. Error Handling

All errors inherit from `InstaConnectError`:
- `InstagramAuthError`: OAuth / token expiration / permission issues (never retried automatically).
- `InstagramRateLimitError`: HTTP 429 or Graph rate limit codes (`4`, `17`, `32`, `613`).
- `InstagramApiError`: Graph API errors with `fbTraceId` and `graphErrorCode`.
- `InstagramValidationError`: Invalid parameters or config.
- `InstagramNetworkError`: Timeouts or network failures.

## 16. Deployment

- Ensure `INSTAGRAM_REDIRECT_URI` uses `https://` in production.
- Configure a persistent `TokenStorageAdapter` (PostgreSQL, Prisma, Redis, or encrypted KV store) so tokens survive serverless cold starts.

## 17. Troubleshooting

- **`OAuthException` code 190**: The user changed their password or revoked app access. Prompt them to re-authorize via `<InstagramConnectButton />`.
- **Next.js `<Image>` hostname error**: Instagram CDN URLs (`*.cdninstagram.com`, `*.fbcdn.net`) are signed and rotate hosts. Use `getInstagramRemotePatterns()` from `@instaconnect/next` in `next.config.mjs`.

## 18. API Reference

- `instagram.auth.getAuthorizationUrl(options)`
- `instagram.auth.handleCallback(params)`
- `instagram.auth.exchangeCodeForShortLivedToken(code)`
- `instagram.auth.exchangeForLongLivedToken(shortLivedToken)`
- `instagram.auth.refreshLongLivedToken(longLivedToken)`
- `instagram.auth.disconnect(options)`
- `instagram.media.list(options)`
- `instagram.media.listReels(options)`
- `instagram.media.get(mediaId)`
- `instagram.media.getChildren(mediaId)`
- `instagram.profile.get(options)`
- `instagram.insights.getMediaInsights(mediaId, options)`
- `instagram.insights.getAccountInsights(options)`
- `instagram.stories.list(options)`

## 19. Meta API Limitations

- **Professional Accounts Only**: The official Instagram API with Instagram Login supports Business (`BUSINESS`) and Creator (`MEDIA_CREATOR`) accounts. Personal accounts cannot be queried.
- **Stories Expiration**: `/me/stories` only returns active stories published within the last 24 hours.
- **CDN URL Expiration**: `media_url` links returned by Meta contain signed query tokens that expire; cache media responses with a reasonable TTL (e.g., 5–15 minutes) rather than storing CDN URLs permanently.

