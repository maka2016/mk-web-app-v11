import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
const { getProcessEnv } = require('@mk/services');
const withNextIntl = createNextIntlPlugin();

const getRunProcessEnv = () => {
  const RUN_ENV = process.env.RUN_ENV;
  const result = RUN_ENV;
  return result;
};

// const assetPrefix = "/invoice_static";
// const basePath = "";

const env = getRunProcessEnv() || getProcessEnv();

const assetPrefix =
  env === 'prod' ? 'https://res.jiantieapp.com/' : process.env.PREFIX || '';
const basePath = process.env.BASEPATH || '';

console.log(env, assetPrefix, basePath);
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: env === 'prod',
  assetPrefix: assetPrefix,
  basePath: basePath ?? (assetPrefix ? assetPrefix : undefined),
  env: {
    ENV: env,
    APP_ID: process.env.APP_ID,
    assetPrefix,
    CAPTCHA_ID: process.env.CAPTCHA_ID,
  },
  // 禁用实验性缓存功能（确保 API 路由不被缓存）
  experimental: {
    // 禁用 Partial Prerendering 缓存
    ...(env === 'prod' ? { ppr: false } : {}),
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'components')],
    silenceDeprecations: ['legacy-js-api'],
  },
  images: {
    remotePatterns: [
      {
        hostname: 'res.maka.im',
        pathname: '/**',
      },
      {
        hostname: 'img1.maka.im',
        pathname: '/**',
      },
      {
        hostname: 'img2.maka.im',
        pathname: '/**',
      },
    ],
    localPatterns: [
      {
        pathname: '/assets/**',
        search: '',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/wxpreset',
        destination: '/api/wxpreset',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
