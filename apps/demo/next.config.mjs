/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@instaconnect/core", "@instaconnect/react", "@instaconnect/next"],
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

