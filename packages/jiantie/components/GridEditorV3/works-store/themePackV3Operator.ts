import { SerializedWorksEntity } from '@/server';
import { deepClone } from '@/utils';
import { makeAutoObservable, runInAction } from 'mobx';
import { themePackV3Manager } from '../componentForContentLib/ThemeLayoutLibraryV3/services';
import { mergeDeepArr } from '../provider/utils';
import {
  ComponentContent,
  ComponentData,
  ComponentGroupData,
  ComponentGroupDataItem,
  GridProps,
} from '../types';
import { IWorksData } from './types';

interface GroupDataManagerConfig {
  getGroupData: () => ComponentGroupData | undefined;
  setGroupData: (data: ComponentGroupData) => void;
  dataName: string;
}

// 通用的分组数据管理器工厂函数（只负责数据操作，不负责保存）
const createGroupDataManager = (config: GroupDataManagerConfig) => {
  const { getGroupData, setGroupData, dataName } = config;

  const updateGroupData = (data: ComponentGroupData) => {
    const groupData = getGroupData();
    const nextGroupData = mergeDeepArr(groupData || [], data);
    setGroupData(nextGroupData);
  };

  const addToGroup = (
    groupId: string,
    nextCompData: ComponentData,
    groupName: string
  ) => {
    const groupData = getGroupData();
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const currGroupIdx = nextGroupData.findIndex(
      (c: ComponentGroupDataItem) => c.groupId === groupId
    );

    if (currGroupIdx !== -1) {
      if (
        nextGroupData[currGroupIdx].datas.find(
          (d: ComponentData) => d.compId === nextCompData.compId
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
    const groupData = getGroupData();
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const currGroupIndex = nextGroupData.findIndex(
      (c: ComponentGroupDataItem) => c.groupId === groupId
    );

    if (currGroupIndex !== -1) {
      const targetIdx = nextGroupData[currGroupIndex].datas.findIndex(
        (d: ComponentData) =>
          d.compId === compData.data.rows[0].sourceComponentId
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
        console.log(`${dataName}GroupData`, getGroupData());
      }
    }
  };

  const deleteGroup = (groupId: string) => {
    const groupData = getGroupData();
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const groupIdx = nextGroupData.findIndex(
      (g: ComponentGroupDataItem) => g.groupId === groupId
    );
    console.log('groupIdx', groupIdx);
    nextGroupData.splice(groupIdx, 1);
    console.log(`next${dataName}GroupDataWithoutGroup`, nextGroupData);
    updateGroupData(nextGroupData);
  };

  const getItemById = (groupId: string, compId: string) => {
    const groupData = getGroupData();
    if (!groupData) {
      throw new Error(`${dataName}分组数据不存在`);
    }
    const nextGroupData = deepClone(groupData);
    const groupIdx = nextGroupData.findIndex(
      (g: ComponentGroupDataItem) => g.groupId === groupId
    );
    if (groupIdx !== -1) {
      return nextGroupData[groupIdx].datas.find(
        (c: ComponentData) => c.compId === compId
      );
    }
    return undefined;
  };

  const moveItemToGroup = (componentId: string, targetGroupId: string) => {
    const groupData = getGroupData();
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
      const idx = newData[i].datas.findIndex(
        (c: ComponentData) => c.compId === componentId
      );
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
    const targetGroupIdx = newData.findIndex(
      (g: ComponentGroupDataItem) => g.groupId === targetGroupId
    );
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
      finalData = newData.filter(
        (g: ComponentGroupDataItem) => g.groupId !== sourceGroupId
      );
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

/**
 * 主题包 V3 数据操作器
 * 负责管理主题包相关的数据，包括组件分组数据、区块分组数据等
 */
export class ThemePackV3Operator {
  /** 主题包作品数据 */
  themePackWorksRes?: {
    detail: SerializedWorksEntity;
    work_data: IWorksData;
  };

  /** 主题包网格属性 */
  themePackGridProps?: GridProps;

  /** 组件分组数据 */
  componentGroupData?: ComponentGroupData;

  /** 区块分组数据 */
  blockGroupData?: ComponentGroupData;

  /** 加载状态 */
  loading = true;

  /** 是否可以更新 */
  private canUpdate = false;

  /** 主题包作品 ID */
  private themePackWorksId?: string;

  /** 主题包文档 ID */
  private themePackDocumentId?: string;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 获取主题包作品数据
   */
  get worksData() {
    return this.themePackWorksRes?.work_data;
  }

  /**
   * 获取所有图层
   */
  get allLayers() {
    return this.worksData ? this.worksData.layersMap : {};
  }

  /**
   * 设置组件分组数据（内部方法，带保存逻辑）
   */
  private _setComponentGroupData = (data: ComponentGroupData) => {
    runInAction(() => {
      this.componentGroupData = data;
    });
    if (this.canUpdate && this.themePackDocumentId && this.themePackWorksId) {
      themePackV3Manager.updateItem(this.themePackDocumentId, {
        content: {
          worksId: this.themePackWorksId,
          componentsGrids: data,
          componentsBlocks: this.blockGroupData || [],
        },
      });
    }
  };

  /**
   * 设置区块分组数据（内部方法，带保存逻辑）
   */
  private _setBlockGroupData = (data: ComponentGroupData) => {
    runInAction(() => {
      this.blockGroupData = data;
    });
    if (this.canUpdate && this.themePackDocumentId && this.themePackWorksId) {
      themePackV3Manager.updateItem(this.themePackDocumentId, {
        content: {
          worksId: this.themePackWorksId,
          componentsGrids: this.componentGroupData || [],
          componentsBlocks: data,
        },
      });
    }
  };

  /**
   * 组件数据管理器
   */
  private get componentManager() {
    return createGroupDataManager({
      getGroupData: () => this.componentGroupData,
      setGroupData: this._setComponentGroupData,
      dataName: '组件',
    });
  }

  /**
   * 区块数据管理器
   */
  private get blockManager() {
    return createGroupDataManager({
      getGroupData: () => this.blockGroupData,
      setGroupData: this._setBlockGroupData,
      dataName: '区块',
    });
  }

  /**
   * 设置主题包数据（不负责加载数据，只负责设置）
   * @param themePackV3RefId 主题包引用 ID
   * @param canUpdate 是否可以更新
   * @param data 主题包数据
   */
  init = (
    themePackV3RefId: GridProps['themePackV3RefId'],
    canUpdate: boolean,
    data: {
      worksData: IWorksData;
      worksDetail: SerializedWorksEntity | any;
      componentContent?: ComponentContent;
    }
  ) => {
    this.canUpdate = canUpdate;
    this.themePackWorksId = themePackV3RefId?.worksId;
    this.themePackDocumentId = themePackV3RefId?.documentId;

    if (!this.themePackWorksId || !this.themePackDocumentId) {
      throw new Error('主题包 worksId 或 documentId 不能为空');
    }

    runInAction(() => {
      this.themePackWorksRes = {
        detail: data.worksDetail,
        work_data: data.worksData,
      };
      this.themePackGridProps = data.worksData.gridProps;
      this.componentGroupData = data.componentContent?.componentsGrids || [];
      this.blockGroupData = data.componentContent?.componentsBlocks || [];
      this.loading = false;
    });
  };

  /**
   * 设置加载状态
   */
  setLoading = (loading: boolean) => {
    runInAction(() => {
      this.loading = loading;
    });
  };

  // ========== 组件数据管理方法 ==========

  /**
   * 设置组件分组数据
   */
  setComponentGroupData = (data: ComponentGroupData) => {
    this.componentManager.updateGroupData(data);
  };

  /**
   * 添加组件到分组
   */
  addComponentToGroup = (
    groupId: string,
    nextCompData: ComponentData,
    groupName: string
  ) => {
    this.componentManager.addToGroup(groupId, nextCompData, groupName);
  };

  /**
   * 更新组件数据
   */
  updateComponentData = (groupId: string, compData: ComponentData) => {
    this.componentManager.updateData(groupId, compData);
  };

  /**
   * 删除组件分组
   */
  deleteComponentGroupData = (groupId: string) => {
    this.componentManager.deleteGroup(groupId);
  };

  /**
   * 获取组件项
   */
  getComponentItem = (groupId: string, compId: string) => {
    return this.componentManager.getItemById(groupId, compId);
  };

  /**
   * 移动组件到分组
   */
  moveComponentToGroup = (componentId: string, targetGroupId: string) => {
    return this.componentManager.moveItemToGroup(componentId, targetGroupId);
  };

  // ========== 区块数据管理方法 ==========

  /**
   * 设置区块分组数据
   */
  setBlockGroupData = (data: ComponentGroupData) => {
    this.blockManager.updateGroupData(data);
  };

  /**
   * 添加区块到分组
   */
  addBlockToGroup = (
    groupId: string,
    nextCompData: ComponentData,
    groupName: string
  ) => {
    this.blockManager.addToGroup(groupId, nextCompData, groupName);
  };

  /**
   * 更新区块数据
   */
  updateBlockData = (groupId: string, compData: ComponentData) => {
    this.blockManager.updateData(groupId, compData);
  };

  /**
   * 删除区块分组
   */
  deleteBlockGroupData = (groupId: string) => {
    this.blockManager.deleteGroup(groupId);
  };

  /**
   * 获取区块项
   */
  getBlockItem = (groupId: string, compId: string) => {
    return this.blockManager.getItemById(groupId, compId);
  };

  /**
   * 移动区块到分组
   */
  moveBlockToGroup = (componentId: string, targetGroupId: string) => {
    return this.blockManager.moveItemToGroup(componentId, targetGroupId);
  };
}
