/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce the minimal traced Node.js runtime used by the AWS container.
  output: 'standalone',
  /**
   * Another dev server (an editor's, say) may already own `.next`; two servers
   * writing one output directory corrupts both. Setting NEXT_DIST_DIR gives a
   * second server its own, and unset it behaves exactly as before.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
