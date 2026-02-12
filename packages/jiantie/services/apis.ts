import { queryToObj } from '@/utils';

/**
 * @export
 * @enum {number}
 */
interface APIMapping {
  /**
   * @deprecated
   */
  根域名: string;
  /**
   * @deprecated
   */
  api_v7: string;
  /**
   * @deprecated
   */
  主服务API: string;
  /**
   * @deprecated
   */
  营销助手服务API: string;

  /**
   * @deprecated
   */
  查询服务API: string;
  工具截图: string;
  工具服务: string;
  表单API: string;
  /**
   * @deprecated
   */
  apiv10: string;
  资源位服务API: string;
}

interface APIEnvMapping {
  dev: APIMapping;
  test: APIMapping;
  staging: APIMapping;
  prod: APIMapping;
}

type EnvTypes = keyof APIEnvMapping;

const envMapping = {
  dev: 'dev',
  development: 'dev',
  test: 'test',
  testing: 'test',
  staging: 'staging',
  prod: 'prod',
  production: 'prod',
} as const;

type EnvMappingKey = keyof typeof envMapping;

const envFilter = (env: string): EnvTypes => {
  return (envMapping[env as EnvMappingKey] || env) as EnvTypes;
};

const EnvConfig: APIEnvMapping = {
  dev: (() => {
    const rootDomain = 'https://test5.maka.im';
    const domainWrapper = (path: string) => `${rootDomain}${path}`;
    return {
      根域名: rootDomain,
      工具截图: domainWrapper('/mk-gif-generator'),
      工具服务: 'https://test5.maka.im/mk-fe-node',
      api_v7: 'https://test5.maka.im/mk-api-services-v7',
      主服务API: 'https://test5-apiv5.maka.im',
      查询服务API: 'https://test5-queryservice.maka.im',
      营销助手服务API: 'https://test5-assistant.maka.im',
      表单API: 'https://test5.maka.im/mk-form-engine',
      apiv10: 'https://apiv10-gateway.testing.maka.im',
      资源位服务API: 'https://gate.testing.maka.im',
    };
  })(),
  test: (() => {
    const rootDomain = 'https://test5.maka.im';
    const domainWrapper = (path: string) => `${rootDomain}${path}`;
    return {
      根域名: rootDomain,
      工具截图: domainWrapper('/mk-gif-generator'),
      api_v7: 'https://test5.maka.im/mk-api-services-v7',
      工具服务: 'https://test5.maka.im/mk-fe-node',
      主服务API: 'https://test5-apiv5.maka.im',
      查询服务API: 'https://test5-queryservice.maka.im',
      营销助手服务API: 'https://test5-assistant.maka.im',
      表单API: 'https://test5.maka.im/mk-form-engine',
      apiv10: 'https://apiv10-gateway.testing.maka.im',
      资源位服务API: 'https://gate.testing.maka.im',
    };
  })(),
  staging: (() => {
    const rootDomain = 'https://staging.maka.im';
    const domainWrapper = (path: string) => `${rootDomain}${path}`;
    return {
      根域名: rootDomain,
      工具截图: domainWrapper('/mk-gif-generator'),
      api_v7: 'https://staging.maka.im/mk-api-services-v7',
      工具服务: 'https://staging.maka.im/mk-fe-node',
      主服务API: 'https://apiv5.maka.im',
      营销助手服务API: 'https://staging-assistant.maka.im',
      查询服务API: 'https://staging-queryservice.maka.im',
      表单API: 'https://staging.maka.im/mk-form-engine',
      apiv10: 'https://staging-apiv10.maka.im',
      资源位服务API: 'https://gate.staging.maka.im',
    };
  })(),
  prod: (() => {
    const rootDomain = 'https://www.maka.im';
    const domainWrapper = (path: string) => `${rootDomain}${path}`;
    return {
      根域名: rootDomain,
      工具截图: domainWrapper('/mk-gif-generator'),
      api_v7: 'https://www.maka.im/mk-api-services-v7',
      工具服务: 'https://maka-frontend-fe.maka.im',
      营销助手服务API: 'https://assistant.maka.im', // TODO: 组件和viewer有依赖
      主服务API: 'https://apiv5.maka.im',
      查询服务API: 'https://queryservice.maka.im',
      表单API: 'https://www.maka.im/mk-form-engine',
      apiv10: 'https://apiv10.maka.im',
      资源位服务API: 'https://gate.maka.im',
    };
  })(),
};

/**
 * 获取当前 process.env.ENV
 */
export const getProcessEnv = (): EnvTypes => {
  const _ENV = process.env.ENV;
  const _NODE_ENV = process.env.NODE_ENV;
  const result = (_ENV || _NODE_ENV || 'dev') as EnvTypes;
  return envFilter(result);
};

/**
 * 获取当前运行环境，优先级：url > process.env
 */
export const getCurrEnv = () => {
  return queryToObj().env || getProcessEnv();
};

/**
 * 获取 api
 * @param api
 * @param path
 * @returns
 */
export const API = (api: keyof APIMapping, path = '', env = '') => {
  const _runtimeEnv = env || (getCurrEnv() as any);

  if (!_runtimeEnv) {
    console.error('API error, 请传入有效环境');
  }
  const currApi = EnvConfig[_runtimeEnv as EnvTypes];
  const urlRes = `${currApi[api]}${path}`;
  return urlRes;
};

const internalUrl = 'https://makapicture.oss-cn-beijing-internal.aliyuncs.com';
const cdnOdd = 'https://makapicture.oss-cn-beijing.aliyuncs.com';
const cdnUrl = process.env.CDN_URL_1 || 'https://img1.maka.im';
const cdnUrl2 = process.env.CDN_URL_2 || 'https://img2.maka.im';
const cdnUrl3 = process.env.CDN_URL_3 || 'https://res.maka.im';

const testCdnUrl =
  process.env.TEST_CDN_URL ||
  'https://maka-dev-test.oss-cn-beijing.aliyuncs.com';

export const cdnApi = (
  resourcePath = '',
  options?: {
    resizeWidth?: number;
    resizeHeight?: number;
    focusResize?: boolean;
    format?: string;
    quality?: number;
    mode?: 'lfit' | 'mfit' | 'fill' | 'pad' | 'fixed';
    limit?: number;
  }
) => {
  if (!resourcePath) {
    console.warn('cdnApi error, 请传入有效参数');
    return '';
  }
  if (/\@/.test(resourcePath)) {
    return resourcePath;
  }
  let resultUrl = '';
  resourcePath = resourcePath.replace(/^\//, '');

  if (!/https?/.test(resourcePath)) {
    resultUrl = `${cdnUrl2}/${resourcePath}`;
  }

  if (/mp4|webm|quicktime|mov/.test(resourcePath)) {
    if (!/https?/.test(resourcePath)) {
      resourcePath = `${cdnUrl2}/${resourcePath}`;
    }
    if (resourcePath.indexOf(cdnOdd) >= 0) {
      resourcePath = resourcePath.replace(cdnOdd, cdnUrl2);
    }
    return resourcePath;
  }

  if (resourcePath.indexOf(cdnUrl3) >= 0) {
    // resultUrl = resourcePath;
    // 替换成cdnUrl2
    resultUrl = resourcePath.replace(cdnUrl3, cdnUrl2);
  }

  if (
    [cdnUrl, cdnUrl2, testCdnUrl].filter(
      (url: string) => resourcePath.indexOf(url) >= 0
    ).length !== 0
  ) {
    resultUrl = resourcePath;
  }

  if (resourcePath.indexOf('http:') >= 0) {
    resultUrl = resourcePath.replace('http', 'https');
  }
  if (/img1/.test(resultUrl)) {
    resultUrl = resultUrl.replace(/\/\/img1/, '//img2');
  }

  if (!resultUrl) return resultUrl;

  const defaultFormat = options?.format || 'webp';
  const defaultQuality = options?.quality || 90;
  const defaultMode = options?.mode || 'lfit';
  const defaultLimit = options?.limit ?? 1;

  if (options?.resizeWidth || options?.resizeHeight || defaultFormat) {
    const lowerUrl = resultUrl.toLowerCase();
    // 检查是否有图片扩展名，或者没有任何扩展名（无后缀）
    const hasImageExt = /\.jpg|\.jpeg|\.png|\.webp|\.bmp|\.tiff|\.heic/.test(
      lowerUrl
    );
    const hasNoExt = !/\.[a-z0-9]+(\?|$)/.test(lowerUrl.split('?')[0]);
    const resizeable = hasImageExt || hasNoExt;

    if (!resizeable) {
      return resourcePath;
    }

    try {
      const w = Math.ceil(options?.resizeWidth || 0);
      const h = Math.ceil(options?.resizeHeight || 0);

      const urlObj = new URL(resultUrl);
      const processParams: string[] = [];

      // Add resize parameters
      if (w || h) {
        const resizeParams = [`m_${defaultMode}`];
        if (w) resizeParams.push(`w_${w}`);
        if (h) resizeParams.push(`h_${h}`);
        if (defaultLimit !== 1) resizeParams.push(`limit_${defaultLimit}`);
        processParams.push(`image/resize,${resizeParams.join(',')}`);
      }

      // Add format parameters
      if (defaultFormat) {
        processParams.push(`image/format,${defaultFormat}`);
        if (defaultQuality !== 90) {
          processParams.push(`q_${defaultQuality}`);
        }
      }

      // Add interlace for progressive loading
      // processParams.push('interlace,1')

      urlObj.searchParams.set('x-oss-process', processParams.join(','));
      resultUrl = urlObj.toString();
    } catch (error) {
      console.log('resultUrl', resultUrl);
      console.error('cdnApi error, 请传入有效参数', error);
    }
  }
  return resultUrl || resourcePath;
};

/** cdnApi test case */
// console.log(cdnApi('/qwr/123/asf', { resizeWidth: 200 }))
// console.log(cdnApi('/qwr/123/asf'))
// console.log(cdnApi('https://img2.maka.im/cdn/jiantie/works-resources/605451665/98238300886593_ef6575', { resizeWidth: 200 }))
// 应该输出: https://img2.maka.im/cdn/jiantie/works-resources/605451665/98238300886593_ef6575?x-oss-process=image/resize,m_lfit,w_200,image/format,webp
