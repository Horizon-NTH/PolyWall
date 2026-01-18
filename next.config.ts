import type { NextConfig } from 'next';
import './src/env';

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
};

export default nextConfig;
