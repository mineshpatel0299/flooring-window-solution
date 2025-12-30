import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Fix for TensorFlow.js - prevent server-side bundling issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Externalize TensorFlow and MediaPipe packages on server to avoid bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@tensorflow/tfjs': 'commonjs @tensorflow/tfjs',
        '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
        '@tensorflow/tfjs-backend-wasm': 'commonjs @tensorflow/tfjs-backend-wasm',
        '@tensorflow-models/body-segmentation': 'commonjs @tensorflow-models/body-segmentation',
        '@mediapipe/selfie_segmentation': 'commonjs @mediapipe/selfie_segmentation',
      });
    }

    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
} as NextConfig;

export default nextConfig;
