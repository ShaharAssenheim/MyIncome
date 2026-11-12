/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  experimental: { serverComponentsExternalPackages: ["pdfjs-dist"] },
};

module.exports = nextConfig;
