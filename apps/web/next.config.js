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
  webpack: (config) => {
    // Handle optional wagmi connector dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@metamask/sdk': false,
      '@gemini-wallet/core': false,
      'porto': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
