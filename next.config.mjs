/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.LINKLEMON_BUILD_DIR || '.next',

  images: {
    // Use ONLY remotePatterns (domains is deprecated)
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/a/**' },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

// Helpful startup log so we know this file is actually loaded
console.log('✅ Loaded next.config.mjs with images.remotePatterns');

export default nextConfig;
