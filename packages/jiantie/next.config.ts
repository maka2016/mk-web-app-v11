import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
const withNextIntl = createNextIntlPlugin();

const getRunProcessEnv = () => {
  const RUN_ENV = process.env.RUN_ENV;
  const result = RUN_ENV;
  return result;
};

// const assetPrefix = "/invoice_static";
// const basePath = "";

const env = getRunProcessEnv() || process.env.ENV;

const assetPrefix = process.env.NODE_ENV === 'production' && env === 'prod' ? process.env.PREFIX || '' : '';
const basePath = process.env.BASEPATH || '';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: env === 'prod',
  // 生产构建时生成浏览器端 source map，便于出错时定位到源码（会增加 build 时间和内存）
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === 'true',
  assetPrefix: assetPrefix,
  basePath: basePath ?? (assetPrefix ? assetPrefix : undefined),
  env: {
    ENV: env,
    APP_ID: process.env.APP_ID,
    BASEPATH: basePath,
    assetPrefix,
    CAPTCHA_ID: process.env.CAPTCHA_ID,
    APIV11: process.env.APIV11,
    BASEORIGIN: process.env.BASEORIGIN,
    GLOBAL: process.env.GLOBAL,
    CDN_URL_1: process.env.CDN_URL_1,
    CDN_URL_2: process.env.CDN_URL_2,
    CDN_URL_3: process.env.CDN_URL_3,
  },
  // 将包含原生绑定的包标记为外部包，避免打包
  serverExternalPackages: [
    '@alicloud/sls20201230',
    '@alicloud/openapi-client',
    '@alicloud/tea-util',
    '@alicloud/credentials',
  ],
  // 禁用实验性缓存功能（确保 API 路由不被缓存）
  experimental: {
    // 禁用 Partial Prerendering 缓存
    ...(env === 'prod' ? { ppr: false } : {}),
  },
  // 减少开发服务器的日志输出
  logging: {
    fetches: {
      fullUrl: false,
    },
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
