
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from "fumadocs-mdx/next";

const isCloudflareDevEnv =
  process.env.NODE_ENV === "development" &&
  (process.env.CF_PAGES === "1" ||
    process.env.WORKERS_CI === "1" ||
    process.env.OPENNEXT_CLOUDFLARE === "1");

if (isCloudflareDevEnv) {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  outputFileTracingExcludes: {
    "*": [
      "./.temp/**/*",
      "./backup/**/*",
      "./backups/**/*",
      "./.backup/**/*",
      "./skills/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  // Exclude server-only packages from client bundle
  serverExternalPackages: ["sharp", "detect-libc"],
  async redirects() {
    return [];
  },
};

// Make sure experimental mdx flag is enabled
const configWithMDX = {
  ...nextConfig,
  experimental: {
    mdxRs: true,
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(configWithMDX)));
