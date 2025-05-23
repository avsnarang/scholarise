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
  // Webpack configuration removed for now to isolate the build issue
  // webpack: (config, { isServer }) => {
  //   // If it's on the client side, provide empty modules for Node.js specific modules
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       http: false,
  //       https: false,
  //       url: false,
  //       path: false,
  //       zlib: false,
  //       stream: false,
  //       crypto: false,
  //       buffer: false,
  //       util: false,
  //       os: false,
  //     };
  //   }
    
  //   return config;
  // },
};

export default config;
