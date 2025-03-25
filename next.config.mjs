/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use webpack 5's built-in Node.js polyfills and fallbacks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load these Node.js modules on the client-side
      config.resolve.alias = {
        ...config.resolve.alias,
        'jsdom': '/src/mocks/jsdom.js',
        'child_process': false,
        'fs': false,
        'net': false,
        'tls': false,
      };
    }
    return config;
  },
  experimental: {
    // Keep turbo option if you want to use it
    turbo: process.env.DISABLE_TURBOPACK !== 'true',
  }
};

export default nextConfig; 