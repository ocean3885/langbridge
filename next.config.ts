import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'yt3.googleusercontent.com',
      },
    ],
    qualities: [75, 90],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        'animated-meme-x7v6wv5vqxj3pwx6-3000.app.github.dev',
        'lang.ai.kr',
        '52.79.212.162:3000'
      ]
    }
  }
};

export default nextConfig;
