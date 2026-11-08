# @instaconnect/core

Framework-agnostic TypeScript SDK for official Meta Instagram OAuth, Token Management, Media (Posts, Reels, Carousels), Profile, Insights, and Stories.

## Usage

```ts
import { InstagramClient } from "@instaconnect/core";

const instagram = new InstagramClient({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
});
```

