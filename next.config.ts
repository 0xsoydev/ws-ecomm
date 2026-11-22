import type { NextConfig } from "next"

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
  "font-src 'self'",
  "connect-src 'self' https://*.razorpay.com https://api.cloudinary.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const indexable = process.env.SITE_INDEXABLE === "true"
const buildCpus = Number(process.env.BUILD_CPUS) || undefined

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: { cpus: buildCpus },
  partialPrefetching: true,
  typedRoutes: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
  },
  headers: () =>
    Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          ...(indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex" }]),
        ],
      },
      {
        source: "/order/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ]),
}

export default nextConfig
