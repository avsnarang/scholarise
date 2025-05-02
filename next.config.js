/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
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
};

export default config;
