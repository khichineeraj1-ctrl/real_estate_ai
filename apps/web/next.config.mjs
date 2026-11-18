import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The repo root: dependencies are hoisted there, and brand.json lives there.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The microphone is allowed for this site only: the ask box takes spoken questions.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
];

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  outputFileTracingRoot: root,
  turbopack: { root },
  experimental: { serverActions: { bodySizeLimit: '2mb' } }, // room for a bulk-import file
  // Listing photos are stored by the API; showing them from this site's own address keeps them same-origin for browsers and crawlers.
  async rewrites() {
    return [{ source: '/media/:file', destination: `${process.env.API_URL || 'http://localhost:4100'}/uploads/:file` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
