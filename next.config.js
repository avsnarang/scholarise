/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  // Add image domains configuration to allow Unsplash images
  images: {
    domains: ['images.unsplash.com'],
  },
  // Configure redirects from old Pages to new App Router paths
  async redirects() {
    return [
      // Redirect any lingering access to pages router to app router
      {
        source: "/pages/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
  // Webpack configuration to handle Node.js modules in client-side bundles
  webpack: (config, { isServer }) => {
    // If it's on the client side, provide empty modules for Node.js specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        url: false,
        path: false,
        zlib: false,
        stream: false,
        crypto: false,
        buffer: false,
        util: false,
        os: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        assert: false,
        constants: false,
        querystring: false,
        timers: false,
        'https-proxy-agent': false,
        'http2': false,
        'perf_hooks': false,
      };
    }
    
    return config;
  },
};

export default config;
