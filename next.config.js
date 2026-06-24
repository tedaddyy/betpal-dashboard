/** @type {import('next').NextConfig} */
const API_BASE = process.env.BACKEND_ORIGIN || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  // Proxy API calls to the BetPal backend so the browser talks to a same-origin
  // path (/api/dashboard/*) in dev and prod. Override the target with
  // BACKEND_ORIGIN (e.g. the Render URL) at build/runtime.
  async rewrites() {
    return [{ source: '/api/dashboard/:path*', destination: `${API_BASE}/api/dashboard/:path*` }];
  },
};

module.exports = nextConfig;
