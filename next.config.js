/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Explicit domains (your project + common Supabase patterns)
    domains: [
      "hztvakrmtnmqxjmijzfh.supabase.co", // your project
      "mrfbltctxqzmdgspqjyo.supabase.co",
      "supabase.co"
    ],
    // Remote patterns are more flexible and future-proof
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**"
      }
    ]
  }
};

// This log helps confirm the file is actually loading.
console.log("✅ Loaded next.config.js with images config:", nextConfig.images);

export default nextConfig;
