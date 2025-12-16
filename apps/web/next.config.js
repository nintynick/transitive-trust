const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ttp/shared', '@ttp/db', '@ttp/trust-engine'],
  // Set the monorepo root for proper file tracing in Vercel
  outputFileTracingRoot: path.join(__dirname, '../../'),
  typescript: {
    // Skip type checking during build (types are checked separately)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
