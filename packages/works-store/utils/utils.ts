import { mergeDeep, random } from '@mk/utils';
import {
  IWorksData,
  LayerElemItem,
  Pages,
  IPositionLink,
  IObject,
  WorksPage,
  PositionLinkMap,
} from '../types';
import { defaultMusic } from '../const';

/** throttle function no lodash */
export const throttle = (fn: Function, delay: number) => {
  let last = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - last > delay) {
      fn(...args);
      last = now;
    }
  };
};

/**
 * 获得当前最高的z轴
 */
export const getMaxZ = (positionLink: PositionLinkMap) => {
  const linkValues = Object.values(positionLink);
  const result = Math.max(...linkValues.map(link => link.zIndex || 0));
  return result + 1;
};
/**
 * 获得默认的link，将会补全参数
 *
 * @param {IPositionLink} link
 * @memberof WorksStore
 */
export const getDefaultLink = (
  link: Partial<IPositionLink>,
  dataLinkDict: IObject<IPositionLink> = {}
) => {
  const maxZIndex = getMaxZ(dataLinkDict);
  const result = {
    // 具备默认值的写在前面
    lock: false,
    visibility: true,
    rotate: 0,
    borderRadius: 0,
    opacity: 1,
    zIndex: maxZIndex,
    mount: false,
    ...link,
  };
  return result as IPositionLink;
};

// = getUrlSearchParams({ target: "works_type" }) || "poster"
/**
 * 获得页面初始数据
 *
 * @static
 * @param {string} pageId 页面id
 * @param {number} scale 画布缩放比例
 * @return {*}  {TWorksData}
 */
export const getDefaultWorksData = (
  override?: Partial<IWorksData>
): IWorksData => {
  const defaultCanvaData = {
    height: 1280,
    width: 720,
  };
  const defaultWorksData: IWorksData = {
    _version: 0,
    pageSetting: {
      paginAnimateSetting: {
        autoPlay: false,
        indicator: 'slim',
        pageNumber: 'none',
        pageTurningEffect: 'layer',
        autoPlayTime: 3,
        disableManualPageTurning: false,
      },
    },
    canvasData: {
      width: defaultCanvaData.width,
      height: defaultCanvaData.height,
      visualHeight: defaultCanvaData.height,
      content: {
        pages: [
          {
            id: random(),
            layers: [],
            opacity: 1,
            background: {
              opacity: 1,
            },
            width: defaultCanvaData.width,
            height: defaultCanvaData.height,
          },
        ],
        fixedPages: {
          layers: [],
        },
        fixedLayer: [],
      },
      actions: {},
      music: defaultMusic,
    },
    positionLink: {},
  };
  return mergeDeep(defaultWorksData, override);
};

type Callback = (item: LayerElemItem, pageIdx: number) => void;

export const deepScanElement = (
  elements: LayerElemItem[],
  callback: Callback,
  pageIdx: number
) => {
  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];

    callback?.(elem, pageIdx);

    const body = elem.body || [];
    if (body.length > 0) {
      deepScanElement(body, callback, pageIdx);
    }
  }
};

export const findItemFromWorks = (
  canvasData: IWorksData['canvasData'],
  eachCB: Callback,
  pageIdx?: number
) => {
  const { pages } = canvasData.content;
  if (typeof pageIdx === 'undefined') {
    for (let i = 0; i < pages.length; i++) {
      const currPage = pages[i];

      deepScanElement(currPage.layers, eachCB, i);
    }
  } else {
    const currPage = pages[pageIdx];
    deepScanElement(currPage.layers, eachCB, pageIdx);
  }
};
