/**
 * Returns the recommended `images.remotePatterns` array for `next.config.js` / `next.config.mjs`
 * when developers choose to use Next.js `<Image />` optimization with Instagram CDN URLs.
 */
export function getInstagramRemotePatterns() {
  return [
    {
      protocol: "https" as const,
      hostname: "**.cdninstagram.com"
    },
    {
      protocol: "https" as const,
      hostname: "**.fbcdn.net"
    }
  ];
}

