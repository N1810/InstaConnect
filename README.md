# InstaConnect

**Production-Ready Instagram Integration SDK for React & Next.js**

InstaConnect is a modular TypeScript SDK that enables developers to connect Instagram Professional (Business and Creator) accounts using the **official Meta Instagram API with Instagram Login**, manage short-lived and 60-day long-lived OAuth tokens, fetch Posts, Reels, Carousel Albums, Profile data, Insights, and active Stories, and render responsive feeds using React components or headless hooks.

---

## Packages

| Package | Description |
| --- | --- |
| [`@instaconnect/core`](./packages/core) | Framework-agnostic core SDK: OAuth, Token Manager, Media, Profile, Insights, Stories, Cursor Pagination, Caching & Rate Limiting |
| [`@instaconnect/react`](./packages/react) | Accessible React components (`<InstagramFeed />`, `<InstagramGrid />`, `<InstagramReels />`, `<InstagramProfile />`, `<InstagramConnectButton />`) and headless hooks |
| [`@instaconnect/next`](./packages/next) | Next.js App Router route handlers (`createInstagramConnectHandler`, `createInstagramCallbackHandler`, `createInstagramMediaHandler`, `createInstagramProfileHandler`, `createInstagramDisconnectHandler`) |
| [`instaconnect`](./cli) | CLI project initializer (`npx instaconnect init`) |

---

## Quick Start

### 1. Installation

```bash
pnpm add @instaconnect/core @instaconnect/react @instaconnect/next
```

Or run the CLI initializer in your Next.js project:

```bash
npx instaconnect init
```

### 2. Environment Variables (`.env.local`)

```env
INSTAGRAM_APP_ID=your_meta_instagram_app_id
INSTAGRAM_APP_SECRET=your_meta_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
INSTAGRAM_API_VERSION=v21.0
INSTACONNECT_STATE_SECRET=replace_with_32_byte_random_hex
```

### 3. Initialize the Server Client (`lib/instagram.ts`)

```ts
import { InstagramClient } from "@instaconnect/core";

export const instagram = new InstagramClient({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
  stateSecret: process.env.INSTACONNECT_STATE_SECRET,
});
```

### 4. Next.js App Router OAuth & API Routes

```ts
// app/api/instagram/connect/route.ts
import { createInstagramConnectHandler } from "@instaconnect/next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramConnectHandler({ client: instagram });
```

```ts
// app/api/instagram/callback/route.ts
import { createInstagramCallbackHandler } from "@instaconnect/next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramCallbackHandler({
  client: instagram,
  successRedirectUrl: "/dashboard",
  onSuccess: async (account) => {
    // Persist account.token in your database or encrypted store
  },
});
```

```ts
// app/api/instagram/media/route.ts
import { createInstagramMediaHandler } from "@instaconnect/next/server";
import { instagram } from "@/lib/instagram";

export const GET = createInstagramMediaHandler({ client: instagram });
```

### 5. Render Instagram Feeds & Reels

```tsx
import { InstagramFeed, InstagramReels, InstagramProfile } from "@instaconnect/react";

export default function PortfolioPage() {
  return (
    <main>
      <InstagramProfile showAvatar showUsername showMediaCount />
      <InstagramFeed limit={12} columns={3} showCaptions showReels showLoadMore />
      <InstagramReels limit={6} autoplay={false} showControls />
    </main>
  );
}
```

---

## Documentation

Complete guides are available in the [`docs/`](./docs) directory:

1. [Full Developer Guide & API Reference](./docs/GUIDE.md)
2. [Meta Developer App Configuration Guide](./docs/META_SETUP.md)
3. [Security Audit Report](./docs/SECURITY_AUDIT.md)
4. [Performance & Caching Report](./docs/PERFORMANCE.md)
5. [npm Publishing & CI Workflow](./docs/PUBLISHING.md)

---

## License

MIT
