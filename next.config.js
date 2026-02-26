/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    EKKLESIA_API_URL: process.env.EKKLESIA_API_URL || 'http://localhost:4000/ekklesia-api',
  },
};

module.exports = nextConfig;
