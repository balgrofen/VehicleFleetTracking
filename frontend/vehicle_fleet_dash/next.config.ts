import type { NextConfig } from 'next';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const config: NextConfig = {
  reactStrictMode: true,
};

const finalConfig: NextConfig = {
  ...withMDX(config),
  output: "standalone", 
};

export default finalConfig;