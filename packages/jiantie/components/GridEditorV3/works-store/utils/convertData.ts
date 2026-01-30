import { GridProps } from '../../utils';
import { deepLayers } from './deepLayers';
import {
  IWorksData,
  IWorksDataLegacy,
  LayerElemItem,
  LayerElemItemMap,
} from '../types/interface';
import { transformV1ToV2 } from '../../utils/transformData';

/**
 * 类型守卫：判断数据是否为旧版格式
 */
export function isLegacyData(
  data: IWorksData | IWorksDataLegacy
): data is IWorksDataLegacy {
  // 检查是否存在 isGridMode 字段，如果不存在则是旧版数据
  return !('isGridMode' in data);
}

/**
 * 将旧版数据转换为新版数据
 * @param legacy 旧版数据
 * @returns 新版数据
 */
export function convertLegacyToNew(
  legacy: IWorksDataLegacy | IWorksData
): IWorksData {
  if (!isLegacyData(legacy)) {
    if (legacy.gridsProps) {
      if (!!legacy.gridProps) {
        legacy.gridProps = legacy.gridsProps;
      }
      delete legacy.gridsProps;
    }
    if (legacy.gridProps.cellsMap && legacy.gridProps.cellsMap.length > 0) {
      legacy.gridProps = transformV1ToV2(legacy.gridProps);
    }
    return legacy as IWorksData;
  }
  // 1. 构建 layersMap：从所有页面提取图层，并合并 positionLink 信息
  const layersMap: LayerElemItemMap = {};
  const { pages } = legacy.canvasData.content;
  const { positionLink = {} } = legacy;

  // 遍历所有页面的图层
  for (const page of pages) {
    if (!page.layers) continue;

    deepLayers(page.layers, (layer: LayerElemItem) => {
      const { elemId } = layer;
      if (!elemId) return;

      // 合并 positionLink 信息到 layer
      const linkInfo = positionLink[elemId];
      const mergedLayer: LayerElemItem = {
        // 如果 positionLink 中存在该元素的信息，则合并
        ...(linkInfo && {
          name: linkInfo.name ?? layer.name,
          animateQueue: linkInfo.animateQueue ?? layer.animateQueue,
          animateQueue2: linkInfo.animateQueue2 ?? layer.animateQueue2,
          action: linkInfo.action ?? layer.action,
          tag: linkInfo.tag ?? layer.tag,
        }),
        ...layer,
      };

      layersMap[elemId] = mergedLayer;
    });
  }

  // 2. 提取 gridsData：查找 GridV3 组件
  let gridProps: GridProps = {} as GridProps;

  for (const elemId in layersMap) {
    const layer = layersMap[elemId];
    if (layer.elementRef && layer.elementRef.includes('GridV3')) {
      gridProps = layer.attrs as GridProps;
      gridProps.id = elemId;
      // 删除 layersMap 中的 GridV3 组件定义，避免重复数据
      delete layersMap[elemId];
      break;
    }
  }

  if (!gridProps.id) {
    throw new Error('转换失败，找不到 GridV3 组件');
  }

  if (gridProps.cellsMap && gridProps.cellsMap.length > 0) {
    // 转换为v2版本数据结构
    gridProps = transformV1ToV2(gridProps);
  }

  // 3. 提取 music
  const music = legacy.canvasData.music || {};

  // 4. 构建新版数据
  // 注意：暂时保留 canvasData 和 positionLink 以便现有代码可以运行
  // 这些字段已标记为 @deprecated，后续需要重构为使用新字段
  const newData: IWorksData = {
    isGridMode: true, // 转换即表示是网格模式
    gridProps,
    layersMap,
    music,
    // 暂时保留以便代码可以运行
    _version: legacy._version,
  };

  return newData;
}
