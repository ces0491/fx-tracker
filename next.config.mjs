/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to enable API routes
  // trailingSlash: true,  // Optional: remove if not needed
  images: {
    unoptimized: true
  },
  // Enable standalone output for Docker deployments
  output: 'standalone'
}

export default nextConfig