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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
