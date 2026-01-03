/** @type {import('next').NextConfig} */
const nextConfig = {
  // Updated again to force cache invalidation
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig