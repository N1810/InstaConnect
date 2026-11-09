/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@neerajkr1810/instaconnect-core",
    "@neerajkr1810/instaconnect-react",
    "@neerajkr1810/instaconnect-next"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cdninstagram.com"
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net"
      }
    ]
  }
};

export default nextConfig;

