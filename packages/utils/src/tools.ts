import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet(
  'ABCDEFGHJKMNPQRSTWXYZabcdefghijklmnopqrstuvwxyz_',
  10
);

/**
 * 转换成数组
 *
 * @param {T} source
 * @returns
 */
export const toArray = <T>(source: T | Array<T>): Array<T> => {
  if (source instanceof Array) {
    return source;
  }
  const result = source != null ? [source] : [];
  return result;
};

/**
 * 生成随机数
 *
 * @param {number} [n=10]
 * @returns
 */
export const random = (n = 10): string => {
  return nanoid(n);
};

/**
 * 限制value不能超出最大最小值
 *
 * @param {number} min
 * @param {number} max
 * @param {number} value
 * @return {*}
 */
export const valueInterval = (min: number, max: number, value: number) => {
  return Math.min(max, Math.max(min, value));
};

export const getImgInfo = (
  src: string
): Promise<{ baseWidth: number; baseHeight: number }> => {
  return new Promise(resolve => {
    const img = new Image();
    img.src = src;
    img.style.visibility = 'hidden';
    img.style.position = 'fixed';
    document.body.appendChild(img);
    img.onload = () => {
      setTimeout(() => document.body.removeChild(img), 1000);
      resolve({ baseWidth: img.offsetWidth, baseHeight: img.offsetHeight });
    };
  });
};
