import { cdnApi } from '@mk/services';
import { random } from '@mk/utils';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { GridProps, GridRow } from '.';
import { getAllLayers } from '../comp/utils';

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

export const cleanGridProps = (cellMaps: GridProps['cellsMap']) => {
  /** 移除 row, cell, children 中的空节点 */
  const nextProps = deepClone(cellMaps)
    ?.map(row => {
      if (!row.cells?.length) return;
      if (!row.id) {
        row.id = random();
      }
      row.cells = row.cells
        .map(cell => {
          if (!cell.id) {
            cell.id = random();
          }
          cell.childrenIds = cell.childrenIds?.filter(Boolean);
          return cell;
        })
        .filter(Boolean);
      return row;
    })
    .filter(Boolean) as GridProps['cellsMap'];

  return nextProps;
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

export const takeXFromMarginOrPadding = (marginOrPadding: string) => {
  // margin may be like "10px" or "10px 20px" or "10px 20px 30px" or "10px 20px 30px 40px"
  if (!marginOrPadding) {
    return 0;
  }
  const marginOrPaddingArr = marginOrPadding.split(' ');
  switch (marginOrPaddingArr.length) {
    case 1:
      const res1 = Number(marginOrPaddingArr[0]?.replace('px', '')) * 2;
      return Number.isNaN(res1) ? 0 : res1;
    case 2:
      const res2 = Number(marginOrPaddingArr[1]?.replace('px', '')) * 2;
      return Number.isNaN(res2) ? 0 : res2;
    case 4:
      const res3 =
        Number(marginOrPaddingArr[1]?.replace('px', '')) +
        Number(marginOrPaddingArr[3]?.replace('px', ''));
      return Number.isNaN(res3) ? 0 : res3;
    default:
      return 0;
  }
};

export function oddRowListReverseV3<T>(originArr: T[], columnCount: number) {
  const chunks = [];

  // 将数组分成每行columnCount个元素的块
  for (let i = 0; i < originArr.length; i += columnCount) {
    chunks.push(originArr.slice(i, i + columnCount));
  }

  // 反转偶数行（索引为奇数的行）
  const processedChunks = chunks.map((chunk, index) => {
    return index % 2 === 1 ? chunk.reverse() : chunk;
  });

  // 展平数组
  return processedChunks.flat();
}

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

export const getAllBlock = (worksData: IWorksData) => {
  const allLayers = getAllLayers(worksData);
  const allBlocks: GridRow[] = [];
  // const layerIds = Object.keys(allLayers);
  for (const layer in allLayers) {
    const currLayer = allLayers[layer];
    if (currLayer.elementRef.includes('GridV3')) {
      console.log('currLayer', currLayer);
      if (currLayer.attrs.cellsMap) {
        // v1模版直接返回
        return null;
      } else if (currLayer.attrs.gridsData) {
        currLayer.attrs.gridsData.forEach((row: GridRow) => {
          allBlocks.push(row);
        });
        break;
      }
    }
  }
  return allBlocks;
};
