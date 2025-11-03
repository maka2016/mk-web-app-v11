import { WorksDetailEntity } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import { useEffect, useState } from 'react';
import {
  getGridProps,
  getWorksData2,
  themePackV3Manager,
} from '../../DesignerToolForEditor/ThemeLayoutLibraryV3/services';
import {
  ComponentData,
  ComponentGroupData,
  deepClone,
  GridProps,
} from '../../shared';
import { mergeDeepArr } from '../provider/utils';
import { getAllLayers } from '../utils';

interface GroupDataManagerConfig {
  groupData: ComponentGroupData | undefined;
  setGroupData: (data: ComponentGroupData) => void;
  dataName: string;
}

// 通用的分组数据管理器工厂函数（只负责数据操作，不负责保存）
const createGroupDataManager = (config: GroupDataManagerConfig) => {
  const { groupData, setGroupData, dataName } = config;

  const updateGroupData = (data: ComponentGroupData) => {
    const nextGroupData = mergeDeepArr(groupData || [], data);
    setGroupData(nextGroupData);
  };

  const addToGroup = (
    groupId: string,
    nextCompData: ComponentData,
    groupName: string
  ) => {
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const currGroupIdx = nextGroupData.findIndex(c => c.groupId === groupId);

    if (currGroupIdx !== -1) {
      if (
        nextGroupData[currGroupIdx].datas.find(
          d => d.compId === nextCompData.compId
        )
      ) {
        throw new Error('组件已存在');
      } else {
        nextGroupData[currGroupIdx].datas.push(nextCompData);
      }
    } else {
      nextGroupData.push({
        groupId,
        datas: [nextCompData],
        groupName,
      });
    }
    updateGroupData(nextGroupData);
  };

  const updateData = (groupId: string, compData: ComponentData) => {
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const currGroupIndex = nextGroupData.findIndex(c => c.groupId === groupId);

    if (currGroupIndex !== -1) {
      const targetIdx = nextGroupData[currGroupIndex].datas.findIndex(
        d => d.compId === compData.data.rows[0].sourceComponentId
      );
      if (targetIdx !== -1) {
        const compName =
          nextGroupData[currGroupIndex].datas[targetIdx].compName;
        nextGroupData[currGroupIndex].datas[targetIdx] = compData;
        nextGroupData[currGroupIndex].datas[targetIdx].compName = compName;
        updateGroupData(nextGroupData);
      } else {
        console.log(
          `找不到要更新的${dataName}组件，请检查代码`,
          groupId,
          compData
        );
        console.log(`${dataName}GroupData`, groupData);
      }
    }
  };

  const deleteGroup = (groupId: string) => {
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const groupIdx = nextGroupData.findIndex(g => g.groupId === groupId);
    console.log('groupIdx', groupIdx);
    nextGroupData.splice(groupIdx, 1);
    console.log(`next${dataName}GroupDataWithoutGroup`, nextGroupData);
    updateGroupData(nextGroupData);
  };

  const getItemById = (groupId: string, compId: string) => {
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const groupIdx = nextGroupData.findIndex(g => g.groupId === groupId);
    if (groupIdx !== -1) {
      return nextGroupData[groupIdx].datas.find(c => c.compId === compId);
    }
    return undefined;
  };

  const moveItemToGroup = (componentId: string, targetGroupId: string) => {
    if (!groupData) {
      console.log('移动组件失败: 分组数据不存在');
      return;
    }

    // 直接在新数据中查找，避免多次深拷贝和查找
    const newData = deepClone(groupData);

    // 找到源组和组件
    let sourceGroupIdx = -1;
    let componentIndex = -1;

    for (let i = 0; i < newData.length; i++) {
      const idx = newData[i].datas.findIndex(c => c.compId === componentId);
      if (idx !== -1) {
        sourceGroupIdx = i;
        componentIndex = idx;
        break;
      }
    }

    // 检查是否找到组件
    if (sourceGroupIdx === -1 || componentIndex === -1) {
      console.log('移动组件失败: 找不到组件', componentId);
      return;
    }

    const sourceGroupId = newData[sourceGroupIdx].groupId;

    // 检查是否移动到同一个组
    if (sourceGroupId === targetGroupId) {
      console.log('移动组件失败: 源组和目标组相同');
      return;
    }

    // 找到目标组
    const targetGroupIdx = newData.findIndex(g => g.groupId === targetGroupId);
    if (targetGroupIdx === -1) {
      console.log('移动组件失败: 找不到目标组', targetGroupId);
      return;
    }

    // 执行移动
    const [component] = newData[sourceGroupIdx].datas.splice(componentIndex, 1);
    newData[targetGroupIdx].datas.push(component);

    // 如果源组已经为空，则删除该组
    let finalData = newData;
    if (newData[sourceGroupIdx].datas.length === 0) {
      finalData = newData.filter(g => g.groupId !== sourceGroupId);
    }

    updateGroupData(finalData);
    return {
      nextGroupData: finalData,
      sourceGroupId,
      componentId,
      sourceRowId: component.compSourceRowId,
    };
  };

  return {
    updateGroupData,
    moveItemToGroup,
    addToGroup,
    getItemById,
    updateData,
    deleteGroup,
  };
};

export const useThemePackV3Data = (
  themePackV3RefId: GridProps['themePackV3RefId']
) => {
  const [themePackWorksRes, setThemePackWorksData] = useState<{
    work_data: IWorksData;
    detail: WorksDetailEntity;
  }>();
  const themePackWorksId = themePackV3RefId?.worksId;
  const themePackDocumentId = themePackV3RefId?.documentId;
  const [componentGroupData, _setComponentGroupData] =
    useState<ComponentGroupData>();
  const [blockGroupData, _setBlockGroupData] = useState<ComponentGroupData>();
  const [themePackGridProps, setThemePackGridProps] = useState<GridProps>();
  const worksData = themePackWorksRes?.work_data;
  const allLayers = worksData
    ? getAllLayers(worksData, false, 'theme_pack_pages')
    : {};

  // 包装 setComponentGroupData，更新后立即保存
  const setComponentGroupData = (data: ComponentGroupData) => {
    _setComponentGroupData(data);
    if (themePackDocumentId && themePackWorksId) {
      themePackV3Manager.updateItem(themePackDocumentId, {
        content: {
          worksId: themePackWorksId,
          componentsGrids: data,
          componentsBlocks: blockGroupData || [],
        },
      });
    }
  };

  // 包装 setBlockGroupData，更新后立即保存
  const setBlockGroupData = (data: ComponentGroupData) => {
    _setBlockGroupData(data);
    if (themePackDocumentId && themePackWorksId) {
      themePackV3Manager.updateItem(themePackDocumentId, {
        content: {
          worksId: themePackWorksId,
          componentsGrids: componentGroupData || [],
          componentsBlocks: data,
        },
      });
    }
  };

  // 创建组件数据管理器
  const componentManager = createGroupDataManager({
    groupData: componentGroupData,
    setGroupData: setComponentGroupData,
    dataName: '组件',
  });

  // 创建区块数据管理器
  const blockManager = createGroupDataManager({
    groupData: blockGroupData,
    setGroupData: setBlockGroupData,
    dataName: '区块',
  });

  // 初始化数据
  useEffect(() => {
    const initThemePackData = async () => {
      if (!themePackWorksId || !themePackDocumentId) {
        return;
      }
      const [worksDataRes, themePackV3Res] = await Promise.all([
        getWorksData2(themePackWorksId),
        themePackV3Manager.getItem(themePackDocumentId),
      ]);
      setThemePackWorksData(worksDataRes.data);
      setThemePackGridProps(
        getGridProps(
          worksDataRes.data.work_data,
          themePackWorksId || 'setThemePackGridProps'
        )
      );
      _setComponentGroupData(themePackV3Res.content?.componentsGrids || []);
      _setBlockGroupData(themePackV3Res.content?.componentsBlocks || []);
    };
    initThemePackData();
  }, [themePackWorksId, themePackDocumentId]);

  return {
    // 基础数据
    themePackWorksRes,
    themePackGridProps,
    componentGroupData,
    blockGroupData,
    worksData,
    allLayers,

    // 组件数据管理方法
    setComponentGroupData: componentManager.updateGroupData,
    addComponentToGroup: componentManager.addToGroup,
    updateComponentData: componentManager.updateData,
    deleteComponentGroupData: componentManager.deleteGroup,
    getComponentItem: componentManager.getItemById,
    moveComponentToGroup: componentManager.moveItemToGroup,
    // 区块数据管理方法
    setBlockGroupData: blockManager.updateGroupData,
    addBlockToGroup: blockManager.addToGroup,
    updateBlockData: blockManager.updateData,
    deleteBlockGroupData: blockManager.deleteGroup,
    getBlockItem: blockManager.getItemById,
    moveBlockToGroup: blockManager.moveItemToGroup,
  };
};
