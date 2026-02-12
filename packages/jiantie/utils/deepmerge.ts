/**
 * 是否为对象
 */
export const isObject = (item: any) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

const originObjKeys = [...Object.getOwnPropertyNames(Object), 'constructor'];

/**
 * @author 相杰
 * @important 基础算法，慎重修改
 *
 * 深 copy
 */
export const mergeDeep = <T extends object>(
  target: T,
  ...sources: any[]
): T => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    const objKeys = Object.getOwnPropertyNames(source);
    objKeys.forEach((k: string) => {
      if (!originObjKeys.includes(k)) {
        Object.assign(target, { [k]: source[k] });
      }
    });
    const protoObj = Object.getPrototypeOf(source);
    if (isObject(source) && protoObj.constructor !== Object) {
      mergeDeep(target, protoObj);
    }
  }

  return mergeDeep(target, ...sources);
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};
