import { random } from '@mk/utils';
import { toJS } from 'mobx';
import { CopyData, IPositionLink, Pages, WorksPage } from '../types';
import { LayerElemItem, PositionLinkMap } from '../types/interface';
import { deepLayers } from '../utils/deepLayers';

export { deepLayers };

export const insertPages = (pages: Pages, index: number, page: WorksPage) => {
  const result = [
    ...pages.slice(0, index),
    { ...page, pageIndex: index },
    ...pages.slice(index),
  ];
  return result;
};

export const checkCopyItem = (
  pasteEntityContentSrc: CopyData | string | undefined,
  cbk: (text: string) => void
) => {
  let pasteEntityContent: CopyData | null = null;
  if (typeof pasteEntityContentSrc === 'string') {
    try {
      pasteEntityContent = JSON.parse(pasteEntityContentSrc) as CopyData;
    } catch (err) {
      console.log(
        `解析粘贴的数据无法转换成编辑器元素数据,尝试转换成富文本组件`
      );
      cbk(pasteEntityContentSrc);
      pasteEntityContent = null;
      return;
    }
  } else {
    pasteEntityContent = pasteEntityContentSrc || null;
  }
  return pasteEntityContent;
};

const deepCopyItem = (entity: LayerElemItem, linkDick: PositionLinkMap) => {
  const linkDatas: PositionLinkMap = {};
  const linkDicts = toJS(linkDick);
  deepLayers([entity], (item, parentId) => {
    const { elemId } = item;
    item.elemId = random();
    if (item.parentId == null) {
      linkDatas[item.elemId] = {
        ...linkDicts[elemId],
        lock: false,
        mount: false,
      };
    } else {
      item.elemId = random();
      item.parentId = parentId;
      linkDatas[item.elemId] = {
        ...linkDicts[elemId],
        parentId,
        lock: false,
        mount: false,
      };
    }
  });
  return { comp: entity, linkDatas };
};

export const changeCopyData = (
  activeEntityID: string,
  entity: LayerElemItem,
  positionLink: PositionLinkMap,
  inputLinkDict?: IPositionLink
) => {
  const { comp, linkDatas } = deepCopyItem(entity, positionLink);
  linkDatas[comp.elemId].x =
    inputLinkDict?.x || +(positionLink[activeEntityID].x || 0);
  linkDatas[comp.elemId].y =
    inputLinkDict?.y || +(positionLink[activeEntityID].y || 0);
  return { comp, linkDatas };
};
