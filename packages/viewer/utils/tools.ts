import { IObject, IPositionLink, IWorksData } from '@mk/works-store/types';

interface ILinkDcitDemotion extends Omit<IPositionLink, 'x' | 'y'> {
  x?: number;
  y?: number;
  z?: number;
}

interface Transform {
  x?: number;
  y?: number;
  z?: number;
  rotate?: number;
}

/**
 * document.querySelectorAll 的简写
 */
export const qs = (selector: string) => {
  return [...((document.querySelectorAll(selector) as any) || [])];
};

export const getTransFormToObjV2 = (dom: HTMLDivElement) => {
  const transformStyle = dom.style.transform;

  const translateMatch = transformStyle.match(/translate\(([^)]+)\)/);
  const translateZMatch = transformStyle.match(/translateZ\(([^)]+)\)/);
  const rotateMatch = transformStyle.match(/rotate\(([^)]+)\)/);

  let tx = 0;
  let ty = 0;
  let tz = 0;
  let rotate = 0;

  if (translateMatch) {
    const [txStr, tyStr] = translateMatch[1].split(',').map(str => str.trim());
    tx = parseFloat(txStr);
    ty = parseFloat(tyStr);
  }

  if (translateZMatch) {
    tz = parseFloat(translateZMatch[1]);
  }

  if (rotateMatch) {
    rotate = +rotateMatch[1].replace('deg', '') || 0;
  }

  return { tx, ty, tz, rotate };
};

const getTransform = (info: Transform, dom: HTMLDivElement) => {
  const { x, y, z, rotate } = info;
  const { ty, tx, tz, rotate: tRotate } = getTransFormToObjV2(dom);
  const x_ = x || tx;
  const y_ = y || ty;
  const z_ = z || tz;
  const r_ = (rotate != null ? rotate : tRotate) || 0;
  const resultStr = `translate(${x_}px, ${y_}px) rotate(${r_}deg) translateZ(${z_}px)`;
  dom.setAttribute('data-rotate', String(r_));
  return resultStr;
};

/**
 * 设置容器的样式
 */
export const setContainerStyle = (
  htmlDom: HTMLDivElement | undefined | null,
  link: ILinkDcitDemotion
) => {
  if (htmlDom == null) return;
  const { id } = htmlDom;
  if (id) {
    const doms = qs(`#${id}`) as Array<HTMLDivElement>;
    doms.forEach(dom => setContainerStyleOne(dom, link));
  } else {
    setContainerStyleOne(htmlDom, link);
  }
};

/**
 * 设置一个容器的样式
 */
const setContainerStyleOne = (
  htmlDom: HTMLDivElement,
  link: ILinkDcitDemotion
) => {
  if (!link) return;
  const dom = htmlDom;
  const { x, y, z, width, height, zIndex, rotate, opacity, visibility } = link;
  const resultDict: IObject = {
    zIndex: `${zIndex}`,
    width: `${width || 0}px`,
    height: `${height || 0}px`,
    opacity,
    // display: visibility ? 'inherit' : 'none',
  };

  if (visibility === false) {
    /** 隐藏元素直接 display none */
    resultDict.display = 'none';
  }

  const transform = getTransform({ x, y, z, rotate }, htmlDom);
  if (transform) {
    resultDict.transform = transform;
  }
  for (const key of [
    'width',
    'height',
    'zIndex',
  ] as (keyof ILinkDcitDemotion)[]) {
    if (link[key] == null) {
      delete resultDict[key];
    }
  }
  for (const key of Object.keys(resultDict)) {
    dom.style[key as any] = resultDict[key];
  }
  dom.setAttribute('parent', link.parentId || '');
};

export const getCurrPageData = (worksData: IWorksData, pageIndex: number) => {
  const { pages } = worksData.canvasData.content;
  return pages[pageIndex] || { layers: [], opacity: 1, background: {} };
};
export const isLockHammer = (path: HTMLDivElement[]) => {
  let lock = false;
  for (const item of path) {
    if (item == null) continue;
    if (item.classList && item.classList.contains('interaction')) {
      if (item.classList.contains('scrollable')) {
        lock = true;
      } else {
        lock = false;
      }
      break;
    }
  }
  return lock;
};
