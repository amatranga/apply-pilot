import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@applypilot/database', '@applypilot/discovery'],
};

export default nextConfig;
