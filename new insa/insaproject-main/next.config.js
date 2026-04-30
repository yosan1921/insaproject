/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = nextConfig

