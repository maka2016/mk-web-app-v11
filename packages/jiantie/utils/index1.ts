export function getContentFragment(input: string): string[] {
  // 使用正则表达式匹配 Markdown 标题 (### 标题)
  const formattedMarkdown = input.replace(/([^\n])\n(?!\n)/g, '$1\n\n');
  const fragments = formattedMarkdown.split(/(?=---\s)/); // 使用 ?= 表示正向断言，确保保留分割的标题部分
  const res = fragments
    .map(fragment => fragment.trim().replace(/---/gi, ''))
    .filter(Boolean); // 去掉前后的空白字符
  return res;
}

export function isHTML(str: string) {
  // 简单判断是否包含 < 和 > 标签
  return /<[^>]+>/.test(str);
}

export function extractImageUrl(input: string): string | null {
  // Match URLs starting with http:// or https://
  const urlRegex = /(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp))/i;
  const match = input.match(urlRegex);

  // Return the matched URL or null if no match found
  return match ? match[1] : null;
}

export interface TemplateGenConfig {
  /** 模版id */
  ids: string[];
  /** 按钮名称 */
  btnName: string;
  /** 生成结构 */
  promptStr: string;
}

export const setCookieExpire = (
  key: string,
  val: any,
  expire = 365 * 24 * 60 * 60 * 1000,
  domain?: string
) => {
  document.cookie = `${key}=${val}; expires=Thu, 18 Dec 2043 12:00:00 GMT;path=/${domain ? `;domain=${domain}` : ''}`;
  const exp = new Date();
  exp.setTime(exp.getTime() + expire);
  document.cookie = `${key}=${val}; expires=${exp.toUTCString()};path=/${domain ? `;domain=${domain}` : ''}`;
};

export const getQueryString = (
  value: string | string[] | undefined
): string => {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
};

export function getUrlWithParam(url: string, key: string) {
  if (typeof window === 'undefined') return url; // 兼容 SSR

  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);

  if (value) {
    const newUrl = new URL(url, window.location.origin);
    newUrl.searchParams.set(key, value);
    return newUrl.toString();
  }

  return url;
}

export function safeCopy(text: string) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed'; // avoid scrolling to bottom
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textarea);
}

export const isClient = () => {
  if (typeof window === 'undefined') {
    return false;
  } else {
    return true;
  }
};

export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch image: ${response.status} ${response.statusText}`
    );
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error'));
    };

    reader.readAsDataURL(blob);
  });
}

export function toOssMiniPCoverUrl(rawUrl: string, type = 'mini'): string {
  if (!rawUrl) return '';

  //去除raw所有的query
  if (rawUrl.includes('?')) {
    const [base, query] = rawUrl.split('?');
    rawUrl = base;
  }

  const imageProcessParams = [
    'image/resize,fill,w_500,limit_0', // 缩放填充至 500x400
    'crop,w_500,h_400,g_center', // 居中裁剪
    'format,jpg', // 转换为 jpg
  ].join('/');

  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}x-oss-process=${imageProcessParams}`;

  // // 处理是否已存在查询参数
  // if (rawUrl.includes("?")) {
  //   const [base, query] = rawUrl.split("?");
  //   const queryParams = new URLSearchParams(query);

  //   // 如果已包含 x-oss-process，不重复加
  //   if (!queryParams.has("x-oss-process")) {
  //     queryParams.set(
  //       "x-oss-process",
  //       "image/format,jpg/resize,m_fill,w_600,h_480/quality,q_70"
  //     );
  //   }

  //   return `${base}?${queryParams.toString()}`;
  // } else {
  //   return `${rawUrl}?${processParams}`;
  // }
}

export function toWechatShareCoverUrl(trawUrl: string): string {
  let rawUrl = trawUrl;
  if (!rawUrl) return '';

  // 去除 @ 及其后面的内容（例如：xxx.jpg@778-1-3987-3987a.src）
  if (rawUrl.includes('@')) {
    const [base] = rawUrl.split('@');
    rawUrl = base;
  }

  if (rawUrl.indexOf('http') < 0) {
    rawUrl = 'https://img1.maka.im' + rawUrl;
  }

  //去除raw所有的query
  if (rawUrl.includes('?')) {
    const [base, query] = rawUrl.split('?');
    rawUrl = base;
  }

  const imageProcessParams = [
    'image/resize,fill,w_200,limit_0', // 缩放填充至 500x400
    'crop,w_200,h_200,g_center', // 居中裁剪
    'format,jpg', // 转换为 jpg
  ].join('/');

  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}x-oss-process=${imageProcessParams}`;
}

export const maskPhoneNumber = (phone: string) => {
  // 参数校验：非空检查 + 类型转换
  if (phone == null || phone === '') return '';
  const phoneStr = String(phone).trim();

  // 核心打码逻辑：正则分组替换
  return phoneStr.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

export function hexToRgba(hex: string, alpha = 1) {
  // 验证透明度范围
  if (alpha < 0 || alpha > 1) {
    throw new Error('透明度必须在0到1之间');
  }

  if (!hex) {
    return '';
  }

  // 移除可能存在的#前缀
  hex = hex.replace(/^#/, '');

  // 验证十六进制格式
  if (!/^(?:[0-9a-fA-F]{3}){1,2}$/.test(hex)) {
    throw new Error('无效的十六进制颜色格式');
  }

  // 处理3位简写格式
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('');
  }

  // 解析RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 返回RGBA字符串
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
