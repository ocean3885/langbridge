import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        'animated-meme-x7v6wv5vqxj3pwx6-3000.app.github.dev'
      ]
    }
  }
};

export default nextConfig;
