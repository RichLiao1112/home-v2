/** @type {import('next').NextConfig} */
const nextConfig = {
  // Windows environments often block symlink creation, which can break standalone output.
  // Set NEXT_OUTPUT_STANDALONE=true when you explicitly need standalone bundles.
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
