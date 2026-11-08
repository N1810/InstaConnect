import { InstagramClient, MemoryCacheAdapter, MemoryTokenStorageAdapter } from "@instaconnect/core";

/**
 * Shared singleton storage & cache for the Next.js server environment.
 * In multi-instance production deployments, pass a RedisCacheAdapter and database TokenStorageAdapter.
 */
const globalForInstagram = globalThis as unknown as {
  instagramClient?: InstagramClient;
};

export function getInstagramServerClient(): InstagramClient {
  if (globalForInstagram.instagramClient) {
    return globalForInstagram.instagramClient;
  }

  const appId = process.env.INSTAGRAM_APP_ID ?? "configure_instagram_app_id_in_env";
  const appSecret = process.env.INSTAGRAM_APP_SECRET ?? "configure_instagram_app_secret_in_env";
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ?? "http://localhost:3000/api/instagram/callback";
  const apiVersion = process.env.INSTAGRAM_API_VERSION ?? "v21.0";
  const stateSecret = process.env.INSTACONNECT_STATE_SECRET ?? "dev_state_secret_replace_in_prod";

  const client = new InstagramClient({
    appId,
    appSecret,
    redirectUri,
    apiVersion,
    stateSecret,
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    cache: new MemoryCacheAdapter({ defaultTtlSeconds: 300 }),
    tokenStorage: new MemoryTokenStorageAdapter()
  });

  if (process.env.NODE_ENV !== "production") {
    globalForInstagram.instagramClient = client;
  }

  return client;
}

export function isInstagramEnvConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID &&
      process.env.INSTAGRAM_APP_SECRET &&
      process.env.INSTAGRAM_REDIRECT_URI
  );
}

