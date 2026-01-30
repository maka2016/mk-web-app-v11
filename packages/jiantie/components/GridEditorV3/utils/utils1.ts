import { cdnApi } from '@/services';
import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { GridRow } from '.';

export * from './styleHelper';

export const deepClone = <T>(obj: T): T => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};

export const removeOssParamRegex = (url: string) => {
  return (
    url
      // 步骤1：移除x-oss-process参数（含前后分隔符）
      .replace(
        /([?&])x-oss-process=[^&#]*(&|$)/g,
        (match, p1, p2) => (p2 === '&' ? p1 : '') // 动态保留分隔符
      )
      // 步骤2：清理残留的?或&符号
      .replace(/(\?|&)+$/, '') // 移除末尾的?或&
      .replace(/\?&/, '?') // 处理?a&b → ?a&b
      .replace(/&&+/g, '&')
  ); // 合并多个&
};

export const bgImageChangeToWebp = (bgImage?: string) => {
  if (!bgImage) return undefined;
  let url = bgImage.replace(/^url\(['"]?|['"]?\)$/g, '');
  url = removeOssParamRegex(url);
  if (/^http/.test(url)) {
    return `url("${cdnApi(url, {
      resizeWidth: 400,
      format: 'webp',
    })}")`;
  }
  return bgImage;
};

export const scrollToActiveRow = (
  rowId?: string,
  focusUpdate = false,
  offsetTop = 40
) => {
  if (typeof rowId === 'undefined') {
    return;
  }
  Promise.resolve().then(() => {
    const scrollDom = document.querySelector<HTMLDivElement>(
      '#designer_scroll_container'
    );
    if (scrollDom) {
      const activeRowDom1 = scrollDom.querySelector<HTMLDivElement>(
        `.parent_row_indicator.row_indicator.indicator_v2.selected.active`
      );
      const activeRowDom2 = scrollDom.querySelector<HTMLDivElement>(
        `.block_indicator.active`
      );
      const activeRowDom =
        activeRowDom1 && activeRowDom1.style.visibility !== 'hidden'
          ? activeRowDom1
          : activeRowDom2;
      if (activeRowDom) {
        // 获取容器的可视区域信息
        const containerTop = scrollDom.scrollTop;
        const containerBottom = containerTop + scrollDom.clientHeight;

        // 获取元素的位置信息
        const rowOffsetTop = activeRowDom.offsetTop;
        const rowOffsetBottom = rowOffsetTop + activeRowDom.offsetHeight;

        // 判断元素是否在可视区域内
        const isInView =
          rowOffsetTop >= containerTop && rowOffsetBottom <= containerBottom;

        if (!isInView || focusUpdate) {
          // 只有当元素不在可视区域时才滚动
          const scrollOffset = rowOffsetTop - offsetTop; // 40px的顶部间距
          console.log('scrollOffset', scrollOffset);

          scrollDom.scrollTo({
            top: scrollOffset,
            behavior: 'smooth',
          });
        }
      } else {
        console.log('scrollDom not found');
      }
    }
  });
};

export const toggleAbsoluteElemAttrs = (layer: LayerElemItem) => {
  const { elemId } = layer;

  const element = document.querySelector(`#layer_root_${elemId}`);
  const nextVal = !layer.attrs?.absoluteElem;
  if (!element) return;
  const elementWidth = nextVal
    ? Math.ceil(element.getBoundingClientRect().width)
    : 'auto';

  return {
    absoluteElem: nextVal,
    position: nextVal
      ? {
          left: 0,
          top: 0,
        }
      : undefined,
    layoutStyle: {
      ...layer.attrs?.layoutStyle,
      width: elementWidth,
      flex: elementWidth === 'auto' ? 1 : undefined,
    },
  };
};

export const getRowName = (row: GridRow, activeRowDepth?: number[]) => {
  const isTableView = row.isTableView;
  const isActiveRowIsList = row.isRepeatList;
  const isComponentEntity = !!row.componentGroupRefId;
  if (isComponentEntity) {
    return 'Comp';
  }
  if (isTableView) {
    return 'Table';
  }
  if (isActiveRowIsList) {
    return 'List';
  }
  if (activeRowDepth?.length === 1) {
    return 'Block';
  }
  if (!activeRowDepth) {
    return 'Grid';
  }
  return activeRowDepth.length > 2 ? 'Cell' : 'Grid';
};

const imgCache = new Map<
  string,
  {
    src: string;
    status: 'loading' | 'loaded' | 'error';
    info?: { baseWidth: number; baseHeight: number };
  }
>();

/**
 * 获取图片宽高
 * @param src 图片路径
 * @returns 图片宽高
 */
export const getImgInfo2 = (
  src: string
): Promise<{ baseWidth: number; baseHeight: number }> => {
  const id = `img_info_img_${src}`;

  // 参数验证
  if (!src || typeof src !== 'string') {
    return Promise.reject(new Error('无效的图片路径'));
  }

  if (imgCache.has(id)) {
    const cached = imgCache.get(id)!;
    if (cached.status === 'loaded') {
      return Promise.resolve(cached.info!);
    }
    if (cached.status === 'error') {
      console.error('图片加载失败', cached.src);
      return Promise.reject(new Error('图片加载失败'));
    }
    if (cached.status === 'loading') {
      // 等待加载完成，添加超时机制
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10秒超时 (100 * 100ms)

        const checkStatus = () => {
          attempts++;
          const info = imgCache.get(id);

          if (!info) {
            reject(new Error('缓存信息丢失'));
            return;
          }

          if (info.status === 'loaded') {
            resolve(info.info!);
          } else if (info.status === 'error') {
            reject(new Error('图片加载失败'));
          } else if (attempts >= maxAttempts) {
            // 超时处理
            imgCache.set(id, {
              src,
              status: 'error',
              info: { baseWidth: 0, baseHeight: 0 },
            });
            reject(new Error('图片加载超时'));
          } else {
            // 继续等待
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    let isResolved = false;

    // 超时处理
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        imgCache.set(id, {
          src,
          status: 'error',
          info: { baseWidth: 0, baseHeight: 0 },
        });
        // 安全移除DOM元素
        try {
          if (img.parentNode) {
            document.body.removeChild(img);
          }
        } catch {
          // 忽略DOM移除错误
        }
        reject(new Error('图片加载超时'));
      }
    }, 10000); // 10秒超时

    img.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        imgCache.set(id, {
          src,
          status: 'error',
          info: { baseWidth: 0, baseHeight: 0 },
        });
        // 安全移除DOM元素
        try {
          if (img.parentNode) {
            document.body.removeChild(img);
          }
        } catch {
          // 忽略DOM移除错误
        }
        resolve({ baseWidth: 0, baseHeight: 0 });
      }
    };

    img.onload = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);

        // 验证图片尺寸
        const width = img.naturalWidth || img.offsetWidth || 0;
        const height = img.naturalHeight || img.offsetHeight || 0;

        const resInfo = {
          baseWidth: width,
          baseHeight: height,
        };

        // 安全移除DOM元素
        try {
          if (img.parentNode) {
            document.body.removeChild(img);
          }
        } catch {
          // 忽略DOM移除错误
        }

        imgCache.set(id, {
          src,
          status: 'loaded',
          info: resInfo,
        });
        resolve(resInfo);
      }
    };

    // 设置图片属性
    img.style.visibility = 'hidden';
    img.style.position = 'fixed';
    img.style.top = '-9999px';
    img.style.left = '-9999px';

    // 安全添加到DOM
    try {
      document.body.appendChild(img);
    } catch {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        reject(new Error('无法添加图片到DOM'));
        return;
      }
    }

    // 设置加载状态
    imgCache.set(id, {
      src,
      status: 'loading',
      info: { baseWidth: 0, baseHeight: 0 },
    });

    // 开始加载
    img.src = cdnApi(src, {
      format: 'webp',
    });
  });
};
