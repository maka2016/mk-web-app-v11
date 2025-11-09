import {
  DebounceClass,
  mergeDeep,
  queryToObj,
  random,
  toArray,
  valueInterval,
} from '@mk/utils';
import { WidgetResItem } from '@mk/widgets-bridge-sdk';
import axios from 'axios';
import { makeAutoObservable, reaction, toJS } from 'mobx';
import {
  ChangeContainerParams,
  EditorSDK,
  GroupType,
  IPositionLink,
} from '../types';
import {
  ActiveItem,
  AddComponentParams,
  ChangeCompAttrMultiParams,
  CompDidMountEmitData,
  CopyData,
  CopyEntityData,
  CopyItem,
  IMusic,
  IWorksData,
  LayerElemItem,
  OperatorHandle,
  PasteDict,
  PositionLinkMap,
  SetLinkBatchParams,
  TemplateShowcaseInfo,
  TemplateShowcasePreviewImage,
  TemplateShowcaseRichText,
  WorksBackground,
  WorksPage,
} from '../types/interface';
import {
  findItemFromWorks,
  getDefaultLink,
  getDefaultWorksData,
  getMaxZ,
  loadWidgetResource,
  setCdnPath,
} from '../utils';
import { deepLayers } from '../utils/deepLayers';
import { IWorksStoreConfig } from './config';
import { changeCopyData, checkCopyItem, insertPages } from './tools';
import { undoManager } from './undoManager';
import { setWorksDetail, WorksDetailEntity } from './WorkSpec';

export * from './undoManager';

const autoSaverDebounce = new DebounceClass();

class TokenError extends Error {
  name = 'TokenError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

class SaveError extends Error {
  name = 'SaveError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

class NetworkError extends Error {
  name = 'NetworkError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

/**
 * 为了避免添加元素时，出现在画布左上角的奇技淫巧
 * TODO: 彻底根治这个问题
 */
const addCompDefalutX = -9999999;

export type WorksStoreConfig = IWorksStoreConfig<WorksStore>;

/**
 * 编辑器运行时状态管理器
 * 范围：编辑器运行时状态的增删查改
 */
export class WorksStore {
  worksData: IWorksData = getDefaultWorksData();

  config: IWorksStoreConfig = {
    autoSaveFreq: -1,
    noSave: false,
    apiVersion: 'v1',
    requestInterceptors: config => config,
    userId: () => '',
    widgetServer: () => '',
    worksServer: () => '',
    widgetResourceCdn: () => '',
    worksId: () => '',
  };

  /** 组件内部状态 */
  widgetState: Record<string, any> = {};

  /** 页面缩放状态 */
  scale = 1;

  /** 当前选中的页面 */
  pageIndex = 0;

  /** 当前正在编辑的元素的 id */
  activeLayerId: string = '';

  /** 控制是否可以缩放 */
  scaleStatus = true;

  /** 被选中的组件的ids */
  areaComps: string[] = [];

  /** 被选中的组件的父级 id */
  areaParentId: string = '';

  /** 被选中的组件的父级的位置信息 */
  areaParentLinkDict: IPositionLink = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    groupType: GroupType.临时,
    lock: false,
    animation: [],
  };

  /** 高亮的组件 */
  highlightComps: string[] = [];

  /** 控制的组件 */
  controlComp = '';

  /** 应用是否已准备好渲染所需要的数据 */
  isAppReady = false;

  /** 组件 metadata 的集合 */
  widgetMetadataColl: Record<string, WidgetResItem> | null = null;

  /** 组件加载状态 */
  widgetLoadState: Record<string, boolean> = {
    GridV3: true,
  };

  /** 组件依赖 */
  widgetRely: Record<string, boolean> = {};
  /** 元素操作区的状态 */
  operationState: Record<string, OperatorHandle> = {};
  isSaved = false;
  saveError = false;
  focusUpdateVersion = 1;
  allWidgetData: Record<string, WidgetResItem> = {};
  worksDetail = {} as WorksDetailEntity;
  getUid = () => {
    const uid = this.worksDetail?.uid || this.config.userId?.();
    if (!uid) {
      throw new Error('uid 不能为空');
    }
    return uid;
  };

  api = {
    reqClient: axios.create({
      timeout: 30000,
    }),
    /** 延迟保存 */
    saveWorksDebounce: () => {
      const { autoSaveFreq, noSave = false } = this.config;
      return new Promise((resolve, reject) => {
        if (noSave) {
          resolve('');
          return;
        }
        this.isSaved = false;
        this.saveError = false;
        autoSaverDebounce.exec(() => {
          this.api.saveWorks('auto').then(resolve).catch(reject);
        }, autoSaveFreq * 1000);
      });
    },

    updateWorksDetail: async (data: Partial<WorksDetailEntity>) => {
      const { worksServer, worksId, isTemplate, apiVersion } = this.config;
      if (isTemplate) {
        throw new Error('模版不能保存');
      }

      // 优先使用自定义 API
      if (this.config.api?.updateWorksDetail) {
        this.worksDetail = {
          ...this.worksDetail,
          ...data,
        };
        setWorksDetail(this.worksDetail);
        return this.config.api.updateWorksDetail({
          id: worksId(),
          data,
        });
      }

      // 回退到内置实现
      if (apiVersion === 'v2') {
        this.worksDetail = {
          ...this.worksDetail,
          ...data,
        };
        setWorksDetail(this.worksDetail);
        return this.api.reqClient.put(
          `${worksServer()}/works/v1/${worksId()}`,
          {
            ...data,
            uid: +this.getUid(),
          }
        );
      } else {
        console.log('v1 不支持更新作品详情');
      }
    },

    /** 立即保存 */
    saveWorks: async (type: 'auto' | 'manual') => {
      const { worksServer, worksId, isTemplate, noSave } = this.config;
      if (noSave || queryToObj().no_save) {
        console.log('noSave', this.getSaveData());
        throw new Error('noSave');
      }

      try {
        // 优先使用自定义 API
        if (this.config.api) {
          const saveData = {
            id: worksId(),
            content: this.getSaveData(),
            isBackup: type === 'manual',
          };

          let saveRes;
          if (isTemplate && this.config.api.saveTemplateContent) {
            saveRes = await this.config.api.saveTemplateContent(saveData);
          } else if (!isTemplate && this.config.api.saveWorksContent) {
            saveRes = await this.config.api.saveWorksContent(saveData);
          } else {
            throw new Error('自定义 API 未实现保存方法');
          }

          this.worksDetail.version = String(saveRes.version);
          setWorksDetail(this.worksDetail);
          this.isSaved = true;
          this.saveError = false;
          return;
        }

        // 回退到内置的 REST API 实现
        if (isTemplate) {
          const commitData = {
            content: this.getSaveData(),
            uid: +this.getUid(),
            isBackup: type === 'manual',
          };
          const url = `${worksServer()}/template/v1/save/${worksId()}`;
          const saveRes = (await this.api.reqClient.post(url, commitData)).data;
          this.worksDetail.version = String(saveRes.version);
        } else {
          const commitData = {
            content: this.getSaveData(),
            uid: +this.getUid(),
            isBackup: type === 'manual',
          };
          const url = `${worksServer()}/works/v1/save/${worksId()}`;
          const saveRes = (await this.api.reqClient.post(url, commitData)).data;
          this.worksDetail.version = String(saveRes.version);
        }
        setWorksDetail(this.worksDetail);
        this.isSaved = true;
        this.saveError = false;
      } catch (err) {
        const _err: any = err;
        // 自定义 API 错误处理
        if (this.config.api) {
          this.saveError = true;
          throw new SaveError(`保存失败: ${_err.message || _err}`);
        }
        // REST API 错误处理
        if (_err.response) {
          console.log('_err.response', _err.response);
          if (_err.response.status === 403) {
            throw new TokenError(`${_err.response.data.msg}`);
          }
          throw new SaveError(`${_err.response.data.msg}`);
        }
        throw new NetworkError(`${_err}`);
      }
    },

    getComponents: async () => {
      const widgetMetadatasResData = (
        await this.api.reqClient.get<WidgetResItem[]>(
          `${this.config.widgetServer()}`
        )
      ).data;
      if (!Array.isArray(widgetMetadatasResData)) {
        console.log('widgetMetadatasResData', widgetMetadatasResData);
        throw new Error(`请传入接口返回的数组数据`);
      }
      widgetMetadatasResData.forEach(item => {
        const { ref } = item;
        this.allWidgetData[ref] = item;
      });
      return widgetMetadatasResData;
    },

    getWorksData: async (): Promise<{
      work_data: IWorksData;
      detail: any;
    }> => {
      const { worksId, worksServer, isTemplate = false, version } = this.config;
      const pageId = worksId();
      const v = version?.();

      // 优先使用自定义 API
      if (this.config.api) {
        try {
          let result: {
            detail: WorksDetailEntity;
            work_data: IWorksData | null;
          } = { detail: {} as WorksDetailEntity, work_data: null };
          if (isTemplate && this.config.api.getTemplateData) {
            result = (await this.config.api.getTemplateData({
              id: pageId,
            })) as any;
            if (result.detail) {
              this.worksDetail = result.detail;
              this.worksDetail.uid = result.detail.uid;
            }
          } else if (!isTemplate && this.config.api.getWorksData) {
            result = (await this.config.api.getWorksData({
              id: pageId,
              version: v,
            })) as any;
            this.worksDetail = result.detail;
          } else {
            throw new Error('自定义 API 未实现获取数据方法');
          }
          return {
            work_data: result.work_data as IWorksData,
            detail: result.detail,
          };
        } catch (e: any) {
          console.log('获取作品数据失败', e);
          throw new Error(e?.message || '获取作品数据失败');
        }
      }

      // 回退到内置的 REST API 实现
      if (isTemplate) {
        const url = `${worksServer()}/template/v1/data/${pageId}`;
        const result = await this.api.reqClient.get(url);
        this.worksDetail = result.data.detail;
        this.worksDetail.uid = result.data.detail.designer_uid;
        return result.data;
      } else {
        try {
          const url = `${worksServer()}/works/v2/data/${pageId}`;
          const res = await this.api.reqClient.get(url, {
            params: {
              version: v,
            },
          });
          this.worksDetail = res.data.detail;
          return res.data;
        } catch (e: any) {
          console.log('获取作品数据失败e', e);
          throw new Error(e?.response?.data?.msg);
        }
      }
    },
  };

  /**
   * 模板商城展示相关 API
   */
  templateShowcase = {
    /**
     * 获取模板商城展示信息
     */
    getShowcaseInfo: (): TemplateShowcaseInfo | null => {
      return this.worksData.templateShowcaseInfo || null;
    },

    /**
     * 设置模板商城展示信息
     */
    setShowcaseInfo: (info: TemplateShowcaseInfo) => {
      this.worksData.templateShowcaseInfo = {
        ...info,
        updatedAt: Date.now(),
      };
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 更新展示标题
     */
    updateTitle: (title: string) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.displayTitle = title;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 更新展示描述
     */
    updateDescription: (description: TemplateShowcaseRichText) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.displayDescription = description;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 添加预览图
     */
    addPreviewImage: (image: TemplateShowcasePreviewImage) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      const images = this.worksData.templateShowcaseInfo.previewImages;

      // 限制最多 9 张
      if (images.length >= 9) {
        throw new Error('最多只能添加 9 张预览图');
      }

      // 设置顺序
      image.order = images.length;

      // 如果是第一张图，自动设为封面
      if (images.length === 0) {
        image.isCover = true;
      }

      images.push(image);
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 删除预览图
     */
    removePreviewImage: (imageId: string) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;
      const index = images.findIndex(img => img.id === imageId);

      if (index === -1) return;

      const removed = images[index];
      images.splice(index, 1);

      // 如果删除的是封面图，自动设置第一张为封面
      if (removed.isCover && images.length > 0) {
        images[0].isCover = true;
      }

      // 重新排序
      images.forEach((img, i) => {
        img.order = i;
      });

      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 设置封面图
     */
    setCoverImage: (imageId: string) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;

      images.forEach(img => {
        img.isCover = img.id === imageId;
      });

      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 重新排序预览图
     */
    reorderPreviewImages: (imageIds: string[]) => {
      if (!this.worksData.templateShowcaseInfo) return;

      const images = this.worksData.templateShowcaseInfo.previewImages;
      const imageMap = new Map(images.map(img => [img.id, img]));

      // 按新顺序重新排列
      const reordered = imageIds
        .map(id => imageMap.get(id))
        .filter(Boolean) as TemplateShowcasePreviewImage[];

      // 更新 order
      reordered.forEach((img, i) => {
        img.order = i;
      });

      this.worksData.templateShowcaseInfo.previewImages = reordered;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 启用/禁用商城展示
     */
    setEnabled: (enabled: boolean) => {
      if (!this.worksData.templateShowcaseInfo) {
        this.worksData.templateShowcaseInfo =
          this.templateShowcase.getDefaultInfo();
      }

      this.worksData.templateShowcaseInfo.enabled = enabled;
      this.worksData.templateShowcaseInfo.updatedAt = Date.now();
      this.worksData._version += 1;
      this.api.saveWorksDebounce();
    },

    /**
     * 验证配置是否有效
     */
    validate: (): { valid: boolean; errors: string[] } => {
      const info = this.worksData.templateShowcaseInfo;
      const errors: string[] = [];

      if (!info) {
        errors.push('商城展示信息未配置');
        return { valid: false, errors };
      }

      // 验证标题
      if (!info.displayTitle || info.displayTitle.length === 0) {
        errors.push('展示标题不能为空');
      }
      if (info.displayTitle.length > 100) {
        errors.push('展示标题不能超过100字符');
      }

      // 验证描述
      if (info.displayDescription.plainText.length > 5000) {
        errors.push('展示描述不能超过5000字符');
      }

      // 验证预览图
      if (info.previewImages.length === 0) {
        errors.push('至少需要添加1张预览图');
      }
      if (info.previewImages.length > 9) {
        errors.push('预览图最多9张');
      }

      // 验证封面图
      const coverCount = info.previewImages.filter(img => img.isCover).length;
      if (coverCount !== 1 && info.previewImages.length > 0) {
        errors.push('必须设置一张封面图');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    /**
     * 获取默认配置
     */
    getDefaultInfo: (): TemplateShowcaseInfo => {
      return {
        displayTitle: '',
        displayDescription: {
          format: 'html',
          content: '',
          plainText: '',
        },
        previewImages: [],
        enabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  };

  constructor(props: WorksStoreConfig) {
    const { worksId } = props;
    if (!worksId()) {
      throw new Error('worksId 不能为空');
    }
    Object.assign(this.config, props);

    this.api.reqClient.interceptors.request.use(config => {
      return this.config.requestInterceptors(config);
    });
    setCdnPath(this.config.widgetResourceCdn());
    makeAutoObservable(this, {
      api: false,
    });
  }

  /**
   * 获取数据
   * @returns
   */
  prepareWorksData = async () => {
    const [worksRes] = await Promise.all([this.api.getWorksData()]);
    return {
      worksRes,
    };
  };

  prepareData = async () => {
    const { autoSaveFreq } = this.config;

    const { worksRes } = await this.prepareWorksData();
    setWorksDetail(this.worksDetail);

    Object.defineProperties(this.worksDetail, {
      width: {
        get: () => this.worksData.canvasData.width,
      },
      height: {
        get: () => {
          console.log(
            'this.worksData.canvasData.visualHeight',
            this.worksData.canvasData.visualHeight
          );
          return this.worksData.canvasData.visualHeight;
        },
      },
    });

    this.initData(worksRes.work_data);

    if (autoSaveFreq > 0) {
      this.runAutoSave();
    }

    return this.worksData;
  };
  private runAutoSave = () => {
    /**
     * 每次 data 更新后，广播保存
     */
    reaction(
      () => toJS(this.worksData),
      () => {
        if (this.isAppReady) {
          this.api.saveWorksDebounce().catch(err => {
            console.log('保存失败', err);
            this.saveError = true;
          });
        }
      }
    );
  };

  initData = (data: IWorksData, config?: Partial<WorksStoreConfig>) => {
    if (config) {
      Object.assign(this.config, config);
    }
    this.setDataWithoutUndo(data);

    const isFlatPage = this.config.isFlatPages;
    let visualHeight = isFlatPage ? 0 : this.worksData.canvasData.visualHeight;
    this.worksData.canvasData.content.pages.forEach(page => {
      /** 给每个页面补全页面id */
      if (!page.id) {
        page.id = random();
      }
      if (
        this.worksData.canvasData.content.pages.filter(p => p.id === page.id)
          .length > 1
      ) {
        page.id = random();
      }
      if (!page.width) {
        page.width = this.worksData.canvasData.width;
      }
      if (!page.height) {
        page.height = this.worksData.canvasData.visualHeight;
      }
      if (isFlatPage) {
        // 重算长页的高度
        visualHeight += page.height;
      }
    });
    if (visualHeight !== this.worksData.canvasData.visualHeight) {
      this.worksData.canvasData.visualHeight = visualHeight;
      this.worksData.canvasData.height = visualHeight;
    }

    // 【关键修复】同步设置作品 ID 并恢复历史记录
    const worksId = this.config.worksId?.();
    if (worksId) {
      // 使用立即执行的异步函数确保初始化顺序正确
      (async () => {
        try {
          await undoManager.setWorksId(worksId);
          // 如果没有恢复到历史记录，则创建初始快照
          if (!undoManager.isUndoable()) {
            this.takeSnapshotOfData('initData');
          }
        } catch (error) {
          console.error('恢复历史记录失败，创建初始快照:', error);
          this.takeSnapshotOfData('initData');
        }
      })();
    } else {
      // 没有 worksId，直接创建初始快照
      this.takeSnapshotOfData('initData');
    }

    this.isAppReady = true;
  };

  redo = () => {
    const redoStore = undoManager.redo();
    if (!redoStore) return;
    // 使用 setDataWithoutUndo，因为 redo 不应该创建新快照
    this.setDataWithoutUndo(redoStore.dataSnapshot);
    this.cleanArea();
    this.clearOperation();

    this.focusUpdateVersion += 1;
  };

  undo = () => {
    const undoStore = undoManager.undo();
    if (!undoStore) return;
    // 使用 setDataWithoutUndo，因为 undo 不应该创建新快照
    this.setDataWithoutUndo(undoStore.dataSnapshot);
    this.cleanArea();
    this.clearOperation();

    this.focusUpdateVersion += 1;
  };

  /**
   * 跳转到指定的历史状态
   * @param targetIndex 目标状态的索引
   */
  jumpToHistory = (targetIndex: number) => {
    const targetStore = undoManager.jumpTo(targetIndex);
    if (!targetStore) return;
    // 使用 setDataWithoutUndo，因为 jumpTo 不应该创建新快照
    this.setDataWithoutUndo(targetStore.dataSnapshot);
    this.cleanArea();
    this.clearOperation();

    this.focusUpdateVersion += 1;
  };

  /**
   * 修改页面数据
   */
  setPage = (pageIndex: number, page: Partial<WorksPage>) => {
    const targetPage = this.getPage(pageIndex);
    this.worksData.canvasData.content.pages[pageIndex] = Object.assign(
      targetPage,
      page
    );
    this.resetCanvasHeight();
  };

  /**
   * 修改画布可视高度-不限制最小高度
   */

  resetCanvasHeight = () => {
    // if (getIsFlatPages()) {
    const pages = this.getPages();
    const height = pages.reduce((sum, page) => sum + page.height, 0);
    this.worksData.canvasData.visualHeight = height;
    this.worksData.canvasData.height = height;
    // }
  };

  setWidgetLoadState = (nextState: Record<string, boolean>) => {
    if (nextState) {
      this.widgetLoadState = {
        ...this.widgetLoadState,
        ...nextState,
      };
    }
  };

  private loadWidgetResourceSelf = () => {
    /** 服务器环境不需要 */
    if (typeof window === 'undefined') return;

    let needToLoadWidget = false;
    if (!this.widgetMetadataColl) return;
    Object.keys(this.widgetRely).forEach(ref => {
      if (!this.widgetLoadState[ref]) {
        needToLoadWidget = true;
      }
    });
    if (!needToLoadWidget) {
      return;
    }
    // console.log('widgetRely :>> ', widgetRely, loadedWidgetCache)
    if (!this.config.appMode) {
      console.error('未设置 this.config.appMode 时，会默认为 editor-web 模式');
    }

    loadWidgetResource({
      widgetMetadataColl: this.widgetMetadataColl,
      widgetRely: this.widgetRely,
      loadedWidgetCache: this.widgetLoadState,
      mode: this.config.appMode || 'editor-web',
    })
      .then(nextLoadedWidgetCache => {
        // EventEmitter.emit('componentZipLoad', {})
        this.setWidgetLoadState(nextLoadedWidgetCache);
      })
      .catch(err => {
        console.error(err);
      });
  };

  setData = (val: IWorksData) => {
    this.worksData = val;
  };

  getDefaultPageData = () => {
    const firstPage = this.worksData.canvasData.content.pages[0];
    const { width, height } = firstPage;
    return {
      id: random(),
      layers: [],
      opacity: 1,
      background: {
        opacity: 1,
      },
      width,
      height,
    } as WorksPage;
  };

  getPage = (pageIdx: number) => {
    return (
      this.worksData.canvasData.content.pages[pageIdx] ||
      this.getDefaultPageData()
    );
  };

  /**
   * 获取当前页面的所有图层
   */
  getPageLayers = (pageIdx: number, withFixedLayers = true) => {
    return [
      ...(this.getPage(pageIdx).layers || []),
      ...(withFixedLayers
        ? this.worksData.canvasData.content.fixedLayer || []
        : []),
    ];
  };

  setPageLayers = (pageIndex: number, layers: LayerElemItem[]) => {
    this.worksData.canvasData.content.pages[pageIndex].layers = layers;
  };

  setMusic = (music: IMusic) => {
    this.worksData.canvasData.music = music;
  };

  /**
   * 获取所有页面的所有图层
   */
  getAllLayers = (withFixedLayer = false) => {
    const { pages, fixedLayer } = this.worksData.canvasData.content;
    const layersItemArray: Array<LayerElemItem> = [];
    for (const page of pages) {
      const { layers } = page;
      deepLayers(layers, item => {
        layersItemArray.push(item);
      });
    }
    if (withFixedLayer) {
      deepLayers(fixedLayer, item => {
        layersItemArray.push(item);
      });
    }
    return layersItemArray;
  };

  /**
   * 给data拍一张快照，推入可撤销栈
   */
  takeSnapshotOfData = (actionName: string, clearRedoStack = false) => {
    undoManager.record({
      actionName,
      dataSnapshot: toJS(this.worksData) as any,
    });
    if (clearRedoStack) {
      undoManager.clearRedo();
    }
  };

  /**
   * setData 不带撤销
   */

  protected setDataWithoutUndo = (nextData: IWorksData) => {
    this.worksData = nextData;
  };

  checkItemIsMount = (compEntityId: string) => {
    return !!this.worksData.positionLink[compEntityId]?.mount;
  };

  /**
   * 整理 works data，删掉无用的 link
   */
  cleanWorks = () => {
    // this.data.
    const elemIds: string[] = [];
    findItemFromWorks(this.worksData.canvasData, item => {
      elemIds.push(item.elemId);
    });

    this.keepLinks(elemIds);
  };

  /**
   * 整理 link 数据，删掉无用的 link
   */
  keepLinks = (elemIds: string[]) => {
    const nextLink: Record<string, IPositionLink> = {};
    elemIds.forEach(id => {
      nextLink[id] = this.worksData.positionLink[id];
    });
    this.worksData.positionLink = nextLink;
  };

  /**
   * 获取保存数据
   */
  getSaveData = (cleanData = false) => {
    if (cleanData) {
      this.cleanWorks();
    }
    return toJS(this.worksData);
  };

  /**
   * 获取图层属性
   */
  getLayerOrigin = (compEntityId: string, withFixedLayer = false) => {
    const layers = this.getAllLayers(withFixedLayer);
    for (let idx = 0; idx < layers.length; idx++) {
      const element = layers[idx];
      if (element.elemId === compEntityId) {
        return element;
      }
    }
  };

  getLayer = (compEntityId: string, withFixedLayer = false) =>
    toJS(this.getLayerOrigin(compEntityId, withFixedLayer));

  fouceUpdate = () => {
    const data = toJS(this.worksData);
    this.setDataWithoutUndo(data);
  };

  /**
   * 计算组件属性版本号
   * @param newVersion 新传入的版本号
   * @param currentVersion 当前版本号
   * @returns 确保返回有效的数字版本号
   */
  private getNextVersion = (newVersion: any): number => {
    if (typeof +newVersion === 'number' && !isNaN(+newVersion))
      return +newVersion + 1;
    return 1;
  };

  changeCompAttr = (
    compEntityId: string,
    nextAttrs: Record<string, any> = {},
    takeSnapshot: boolean | string = true
  ) => {
    const layers = this.getAllLayers();
    let changedLayer: LayerElemItem | null = null;

    deepLayers(layers, element => {
      if (element.elemId === compEntityId) {
        element.attrs = mergeDeep(element.attrs, {
          ...nextAttrs,
          // 内置version追踪器
          _v: this.getNextVersion(nextAttrs._v || element.attrs._v),
        });
        changedLayer = element;
      }
    });
    this.fouceUpdate();
    if (takeSnapshot) {
      // 如果 takeSnapshot 是字符串，使用它作为 actionName
      // 否则自动生成描述性的 actionName
      const actionName =
        typeof takeSnapshot === 'string'
          ? takeSnapshot
          : this.generateActionNameFromLayer(
              compEntityId,
              changedLayer,
              nextAttrs
            );
      this.takeSnapshotOfData(actionName);
    }
  };

  /**
   * 根据修改的图层生成描述性的操作名称
   */
  private generateActionNameFromLayer(
    compEntityId: string,
    layer: LayerElemItem | null,
    attrs: Record<string, any>
  ): string {
    // 从 positionLink 获取组件名称或标签
    const link = this.worksData.positionLink[compEntityId];
    let componentName = '';

    if (link?.name) {
      componentName = link.name;
    } else if (link?.tag) {
      componentName = link.tag;
    } else if (layer?.elementRef) {
      // 使用组件类型作为后备
      componentName = layer.elementRef;
    } else {
      componentName = '组件';
    }

    // 获取主要修改的属性（过滤内部属性）
    const changedKeys = Object.keys(attrs).filter(key => !key.startsWith('_'));
    const mainAttr = changedKeys[0] || '属性';

    return `修改${componentName}:${mainAttr}`;
  }

  changeCompAttrMulti = (
    params: ChangeCompAttrMultiParams,
    actionName?: string
  ) => {
    const layers = this.getAllLayers();
    const changedLayers: Array<{
      elemId: string;
      layer: LayerElemItem | null;
      attrs: Record<string, any>;
    }> = [];

    params.forEach(_i => {
      let foundLayer: LayerElemItem | null = null;
      deepLayers(layers, element => {
        if (element.elemId === _i.elemId) {
          element.attrs = mergeDeep(element.attrs, {
            ..._i.nextAttrs,
            // 内置version追踪器
            _v: this.getNextVersion(_i.nextAttrs._v || element.attrs._v),
          });
          foundLayer = element;
        }
      });
      changedLayers.push({
        elemId: _i.elemId,
        layer: foundLayer,
        attrs: _i.nextAttrs,
      });
    });
    this.fouceUpdate();

    // 生成操作名称
    const finalActionName =
      actionName ||
      (params.length === 1
        ? this.generateActionNameFromLayer(
            changedLayers[0].elemId,
            changedLayers[0].layer,
            changedLayers[0].attrs
          )
        : this.generateBatchActionName(changedLayers));

    this.takeSnapshotOfData(finalActionName);
  };

  /**
   * 生成批量操作的名称
   */
  private generateBatchActionName(
    changedLayers: Array<{
      elemId: string;
      layer: LayerElemItem | null;
      attrs: Record<string, any>;
    }>
  ): string {
    if (changedLayers.length === 0) {
      return '批量修改';
    }

    // 收集所有组件的名称
    const componentNames = changedLayers
      .slice(0, 3)
      .map(({ elemId, layer }) => {
        const link = this.worksData.positionLink[elemId];
        return link?.name || link?.tag || layer?.elementRef || '组件';
      });

    if (changedLayers.length > 3) {
      return `批量修改${componentNames.join('、')}等${changedLayers.length}个`;
    }

    return `批量修改${componentNames.join('、')}`;
  }

  delLink = (compEntityId: string | string[]) => {
    if (compEntityId instanceof Array) {
      compEntityId.forEach(id =>
        Reflect.deleteProperty(this.worksData.positionLink, id)
      );
    } else {
      Reflect.deleteProperty(this.worksData.positionLink, compEntityId);
    }
  };

  /**
   * 给组件实例更改容器信息的接口
   */
  //
  changeContainerInfoForWidgetEitity = (
    compEntityId: string,
    nextScale: ChangeContainerParams
  ) => {
    if (!compEntityId) {
      return console.error(
        `changeContainerInfoForWidgetEitity 失败，请传入 compEntityId`
      );
    }
    Object.assign(this.worksData.positionLink[compEntityId], nextScale);
  };

  /**
   * 设置容器的配置
   */
  //
  setLinkBatch = (params: SetLinkBatchParams) => {
    params.forEach(param => {
      const { elemId, nextContainerInfo } = param;
      if (this.worksData.positionLink[elemId]) {
        Object.assign(this.worksData.positionLink[elemId], nextContainerInfo);
      }
    });
  };

  /**
   * 修改页面设置
   * @param pageIndex
   * @param options
   */
  setPageOptions = (pageIndex: number, options: WorksPage['options']) => {
    const page = this.getPage(pageIndex);
    if (page) {
      page.options = Object.assign({}, page.options, options);
    }
  };

  getPages = () => {
    const { pages } = this.worksData.canvasData.content;
    return pages;
  };

  onComponentDidMount = (
    compEntityId: string,
    didMountData: CompDidMountEmitData,
    pageIndex?: number
  ) => {
    const { boxInfo, data } = didMountData;
    // const link = this.data.positionLink[compEntityId]
    let data_ = data;
    if (data_?.__newCommit__) {
      // 让组件有一次修改 attr 的机会
      this.changeCompAttr(compEntityId, data_);
    }
    // console.log(compEntityId,this.data.positionLink[compEntityId])

    if (
      this.worksData.positionLink[compEntityId] == null ||
      this.worksData.positionLink[compEntityId].mount
    )
      return;

    const currLinkDictData = this.worksData.positionLink[compEntityId];

    this.worksData.positionLink[compEntityId].width =
      boxInfo.width || currLinkDictData.width;
    this.worksData.positionLink[compEntityId].height =
      boxInfo.height || currLinkDictData.height;
    this.worksData.positionLink[compEntityId].x =
      boxInfo.x || currLinkDictData.x;
    this.worksData.positionLink[compEntityId].y =
      boxInfo.y || currLinkDictData.y;

    if (this.worksData.positionLink[compEntityId].x === addCompDefalutX) {
      /** 设置为已设置，下次不在执行以下逻辑 */

      if (this.config.elementDidMount) {
        const didmoutNewData = this.config.elementDidMount(
          compEntityId,
          boxInfo,
          data,
          this
        );
        if (didmoutNewData && data_?.__newCommit__) {
          // 当挟持生命周期存在值时，修改组件入参
          data_.width = didmoutNewData.width || data_.width;
          data_.height = didmoutNewData.height || data_.height;
          this.changeCompAttr(compEntityId, data_);
        }
      } else {
        if (this.worksData.positionLink[compEntityId].x === addCompDefalutX) {
          // 由于 addComponent 时，x y 坐标为元素左上角，以下逻辑为将元素修正到中心点,NaN为特殊赋值
          const { height, width } = this.getPage(
            pageIndex !== undefined ? pageIndex : this.pageIndex
          );
          this.worksData.positionLink[compEntityId].x =
            (width - boxInfo.width) / 2;
          this.worksData.positionLink[compEntityId].y =
            (height - boxInfo.height) / 2;
        }
      }
    }

    // 设置元素已经加载到画布中
    this.worksData.positionLink[compEntityId].mount = true;
    if (data_) {
      this.changeCompAttr(compEntityId, data_);
    }
  };

  duplicateComp = (targetId: string | string[], needSelectItem = true) => {
    const copyData = this.getCopyEntityData(targetId);
    if (copyData) {
      return this.elementPaste(copyData, {}, needSelectItem);
    } else {
      console.log('复制失败, 请检查元素是否存在');
    }
  };

  /**
   * 设置作品样式表
   */

  setWorksStyle = (worksStyke: Partial<IWorksData['style']>) => {
    // this.data = val
    if (!this.worksData.style) {
      this.worksData.style = {
        layer: {},
        works: {},
      };
    }
    this.worksData.style = mergeDeep({}, this.worksData.style, worksStyke);
  };

  elementPaste = (
    pasteEntityContentSrc: CopyEntityData,
    pasteDcit: PasteDict,
    needSelectItem = true
  ): string[] | undefined => {
    if (pasteEntityContentSrc == null) {
      console.log('粘贴的数据为空');
      return;
    }
    const resIds: string[] = [];
    for (const pastenEntityItem of pasteEntityContentSrc.entities) {
      if (!this.isDisableCopy(pastenEntityItem.compId)) {
        const { positionLink: originLinkAll, moveInfo } = pasteDcit;
        const { compId, entity, originLink } = pastenEntityItem;
        const pastreData = changeCopyData(compId, entity, {
          ...this.worksData.positionLink,
          ...originLinkAll,
        });
        const { comp, linkDatas } = pastreData;
        const { height, width } = this.getPage(this.pageIndex);
        let link = {
          ...originLink,
          zIndex: getMaxZ(this.worksData.positionLink),
        };
        Object.entries(linkDatas).forEach(item => {
          const [key, positionLink] = item;
          if (key !== comp.elemId) {
            const dict = { ...positionLink };
            this.worksData.positionLink[key] = dict;
          }
        });

        if (moveInfo) {
          link.x += moveInfo.dx || 0;
          link.y += moveInfo.dy || 0;
        } else if (originLinkAll) {
        } else {
        }
        const eleId = this.addComponentAction(comp, link);
        resIds.push(eleId);
      }
    }
    return resIds;
  };

  /**
   * 是否屏蔽公共属性操作入口
   */
  isCommonOperatorDisabled = (compId: string) => {
    return false;
  };

  /**
   * 是否禁用复制
   */
  isDisableCopy = (comId?: string) => {
    return false;
  };

  /**
   * 是否禁用删除功能
   */
  isDisableDelete = (comId: string) => {
    if (this.isCommonOperatorDisabled(comId) || this.getLink(comId)?.lock) {
      return true;
    }
    return false;
  };

  getLink = (elemId: string) => {
    // const positionLink = Object.assign({}, this.data.positionLink, {
    //   [this.areaParentId]: this.areaParentLinkDict,
    // })
    return (
      this.worksData.positionLink[elemId] ||
      {
        [this.areaParentId]: this.areaParentLinkDict,
      }[elemId]
    );
  };

  setPageIndex = (index: number) => {
    if (index === null || index === undefined || this.pageIndex === index) {
      return;
    }
    this.pageIndex = index;
  };
  /**
   * 清空操作区
   */

  clearOperation = () => {
    const { controlComp } = this;
    this.areaComps = [];
    this.highlightComps = [];
    this.controlComp = '';
    this.activeLayerId = '';
    return controlComp;
  };

  setScaleStatus = (status: boolean) => {
    this.scaleStatus = status;
  };

  cleanArea = () => {
    this.areaParentId = '';
    this.areaParentLinkDict = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      groupType: GroupType.临时,
      rotate: 0,
    };
  };

  /**
   * 获取操作框的状态
   */
  getOperatorHandle = (compEntityId: string) => {
    return this.operationState[compEntityId];
  };

  /**
   * 更改操作框的状态
   */
  changeOperatorHandle = (compEntityId: string, nextVal: OperatorHandle) => {
    this.operationState[compEntityId] = nextVal;
  };

  /**
   * 设置控制项，并且激活此元素
   */
  setControlComp = (id: string, path?: string[]) => {
    this.controlComp = id;
    this.areaComps = this.areaComps.filter(comId => comId !== id);
    this.highlightComps = this.highlightComps.filter(comId => comId !== id);
    this.setActivItemByID(id, path);
  };

  setActivItemByID = (compEntityId: string, path?: string[]) => {
    const targetLink = this.worksData.positionLink[compEntityId];
    const targetEntity = this.getLayer(compEntityId, true);
    const nextActiveItem: ActiveItem = {
      name: '',
      contentProps: {},
      comId: '',
      idx: 0,
      path,
    };

    if (targetEntity && targetLink) {
      nextActiveItem.comId = compEntityId;
      nextActiveItem.contentProps = targetEntity;
      nextActiveItem.name = targetEntity.elementRef;
      nextActiveItem.idx = targetLink.zIndex ? targetLink?.zIndex : 0;
    }
    this.setActivLayer(compEntityId);
    // this.setActivItem(nextActiveItem)
  };

  protected setActivLayer = (layerId: string) => {
    this.activeLayerId = layerId;
  };

  deleteActiveCompEntity = (undoable = true) => {
    const activeEntityID = this.activeLayerId;
    // const { positionLink } = this.data
    // const parentId = getMostParentByCompId(activeEntityID, positionLink)
    // const brotherIds = Object.keys(positionLink).filter((id) => positionLink[id].parentId === parentId && id !== activeEntityID)
    if (activeEntityID) {
      if (undoable) {
        this.deleteCompEntity(activeEntityID);
      } else {
        this.deleteCompEntityFun(activeEntityID);
      }
    }
  };

  private deleteCompEntityFun = (
    compEntityId: string | string[],
    pageIndex = this.pageIndex
  ) => {
    const ids = toArray(compEntityId);
    const deleteKeys: string[] = [];
    const layers = this.getPageLayers(pageIndex, false);
    const deleteLayers: LayerElemItem[] = [];

    const pickRemainingLayers = (layerList: LayerElemItem[]) => {
      const result: LayerElemItem[] = [];
      for (const item of layerList) {
        const { elemId } = item;
        if (
          ids.includes(elemId) ||
          (item.parentId && ids.includes(item.parentId))
        ) {
          deleteKeys.push(elemId);
        }
        if (ids.includes(elemId)) {
          deleteLayers.push(item);
        } else {
          result.push(item);
        }
        if (item.body) {
          item.body = pickRemainingLayers(item.body);
        }
      }
      return result;
    };
    const nextLayers = pickRemainingLayers(mergeDeep(layers));
    this.areaComps = this.areaComps.filter(
      areaId => !ids.includes(areaId) && !this.isDisableDelete(areaId)
    );
    this.setPageLayers(pageIndex, nextLayers);
    this.delLink(deleteKeys);
  };

  deleteCompEntity = (
    compEntityId: string | string[],
    pageIndex = this.pageIndex
  ) => {
    this.deleteCompEntityFun(compEntityId, pageIndex);
    this.cleanArea();
    this.clearOperation();
    this.setActivItemByID('');
  };

  setAreaComps = (ids: string | string[]) => {
    if (ids instanceof Array) {
      this.areaComps = ids.filter(id => {
        const { visibility = true } = this.worksData.positionLink[id];
        return visibility;
      });
    } else if (this.controlComp !== ids) {
      const dict = this.worksData.positionLink[ids];
      if (!this.areaComps.includes(ids) && dict.visibility) {
        this.areaComps.push(ids);
      }
    }
  };

  private addComponentAction = (
    eleItem: AddComponentParams,
    link?: IPositionLink
  ) => {
    const { elemId = random(), type = 'element', elementRef } = eleItem;
    const pushItem = { ...eleItem } as LayerElemItem;
    const { pageIndex } = this;

    pushItem.elemId = elemId;
    pushItem.type = type;

    // 健壮性代码，如果 page 不存在，则赋默认值
    // const pagePath = `canvasData.content.pages[${pageIndex}]`

    if (!this.worksData.canvasData.content.pages[pageIndex]) {
      this.worksData.canvasData.content.pages[pageIndex] =
        this.getDefaultPageData();
    }

    const items = this.getPageLayers(pageIndex, false);

    items.push(pushItem);
    this.setPageLayers(pageIndex, items);
    this.setLink(elemId, link);
    // 更新作品meta
    this.areaComps = [];

    return elemId;
  };

  addComponent = (
    eleItem: AddComponentParams,
    link?: IPositionLink,
    activeItem = true
  ) => {
    const elemId = this.addComponentAction(eleItem, link);
    if (activeItem) {
      setTimeout(() => {
        this.setActivItemByID(elemId);
        this.setControlComp(elemId);
      }, 10);
    }
    return elemId;
  };

  /**
   * 批量添加组件
   */

  addComponentBatch = (
    eleItems: AddComponentParams[],
    positionLink: PositionLinkMap
  ) => {
    const { pageIndex } = this;
    const layerItems = this.getPageLayers(pageIndex, false);
    eleItems.forEach(eleItem => {
      const { elemId: defaultID, type = 'element' } = eleItem;
      const pushItem = { ...eleItem } as LayerElemItem;
      const elemId = defaultID || random();

      pushItem.elemId = elemId;
      pushItem.type = type;

      // 健壮性代码，如果 page 不存在，则赋默认值
      if (!this.worksData.canvasData.content.pages[pageIndex]) {
        this.worksData.canvasData.content.pages[pageIndex] =
          this.getDefaultPageData();
      }
      layerItems.push(pushItem);
    });
    this.setPageLayers(pageIndex, layerItems);

    if (positionLink) {
      Object.assign(this.worksData.positionLink, positionLink);
    }
  };

  /**
   * 修改画布可视高度
   */

  setPageCanvaHeight = (pageIndex: number, height: number) => {
    const page = this.getPage(pageIndex);
    if (page && height != null) {
      page.height = height;
    }
    this.resetCanvasHeight();
  };

  private addMkTextByCopy = (text: string) => {
    this.addComponent({
      attrs: {
        fontUrl: 'https://font.maka.im/20190724/Alibaba-PuHuiTi-Regular.ttf',
        fontFamily: 'Alibaba-PuHuiTi-Regular',
        text: `<p>${text}</p>`,
        fontSize: 28,
      },
      elementRef: 'MkText',
    });
  };

  private copyEntityAction = (
    pasteEntityContentSrc?: CopyData | string
  ): CopyItem | null => {
    const pasteEntityContent = checkCopyItem(pasteEntityContentSrc, text => {
      this.addMkTextByCopy(text);
    });
    const entity = pasteEntityContent?.entity;
    if (!entity) return null;
    const { elemId } = entity;
    const originLink = toJS(this.worksData.positionLink[elemId]);
    delete originLink.parentId;
    return { entity, compId: elemId, originLink };
  };

  /**
   * 获取复制的数据
   */
  getCopyEntityData = (compId?: string[] | string): CopyEntityData | null => {
    const targetKey = compId || this.activeLayerId;
    const comIds = Array.isArray(targetKey) ? targetKey : [targetKey];
    const copyLink: Record<string, IPositionLink> = {};
    comIds.forEach(id => {
      copyLink[id] = toJS(this.worksData.positionLink[id]);
    });
    return {
      entities: comIds
        .map(id => {
          const targetKey = id;
          if (!targetKey) return null;
          const entity = this.getLayer(targetKey);
          delete entity?.parentId;
          if (entity) {
            const copyJson = this.copyEntityAction({ entity: entity });
            if (copyJson) {
              return copyJson;
            }
          }
          return null;
        })
        .filter(Boolean),
      positionLink: copyLink,
    } as CopyEntityData;
  };

  /**
   * 设置容器的配置
   */

  setLink = (elemId: string, link?: Partial<IPositionLink>) => {
    if (link == null) {
      this.worksData.positionLink[elemId] = getDefaultLink(
        {
          x: addCompDefalutX, // TODO: 不要再采用这个奇技淫巧
          y: 0,
          rotate: 0,
        },
        this.worksData.positionLink
      );
    } else {
      const currLink = this.getLink(elemId);
      if (!currLink) {
        this.worksData.positionLink[elemId] = getDefaultLink(
          link,
          this.worksData.positionLink
        );
      } else {
        this.worksData.positionLink[elemId] = { ...currLink, ...link };
      }
    }
  };
  /**
   * 新增页面的基础方法
   */

  addPage = (
    index?: number,
    pageData?: WorksPage,
    positionLink?: PositionLinkMap,
    needSelectBG = true,
    onErr?: (message: string) => void
  ) => {
    let targetIndex = index;
    const maxPage = this.config.maxPage || 10;
    if (this.worksData.canvasData.content.pages.length >= maxPage) {
      console.error('已超过最大页数限制');
      onErr?.('已超过最大页数限制');
      return;
      // throw new Error('已超过最大页数限制')
    }
    if (targetIndex == null) {
      targetIndex =
        Math.max(
          ...Object.keys(this.worksData.canvasData.content.pages).map(Number)
        ) || 0;
    }
    targetIndex += 1;
    const pages = this.getPages();
    const prevPage = pages[targetIndex - 1];
    const { width, height } = prevPage;
    const data = pageData || this.getDefaultPageData();
    data.width = pageData?.width || width;
    data.height = pageData?.height || height;
    const newPages = insertPages(pages, targetIndex, data);
    this.worksData.canvasData.content.pages = newPages;

    if (positionLink) {
      Object.assign(this.worksData.positionLink, positionLink);
    }
    this.setPageIndex(targetIndex);
    this.clearOperation();
    this.setActivItemByID('');
  };

  /**
   * 复制页面的基础方法
   * 只在 UI 层拦截 enableCopy，次方法不检查
   */

  copyPage = (key: number, needSelectBG = true) => {
    const index = +key;
    // const pages = this.getPages()
    const page = this.getPage(key);
    if (!page) {
      return;
    } else {
      // if (page.options?.enableCopy === false) {
      //   return
      // }
      const page_ = toJS(page);
      page_.id = random();
      const copyPageRes = {
        oldPageId: page.id,
        newPageId: page_.id,
        layerIdMap: {},
      } as any;
      const { layers } = page_;
      const idContrastMap: Record<
        string,
        { newId: string; oldParentId?: string; newParentId?: string }
      > = {};
      deepLayers(layers, item => {
        const newId = random();
        const { elemId } = item;
        if (elemId != null) {
          const oldParentId = item.parentId;
          const newParentId = idContrastMap[item.parentId || '']?.newId;
          idContrastMap[elemId] = { newId, oldParentId, newParentId };
          item.elemId = newId;
          item.parentId = newParentId;

          copyPageRes.layerIdMap[elemId] = {
            elemId: newId,
            elemRef: item.elementRef,
          };
        }
      });
      Object.entries(idContrastMap).forEach(item => {
        const [oldId, newObj] = item;
        const { newId, newParentId } = newObj;
        this.worksData.positionLink[newId] = toJS(
          this.worksData.positionLink[oldId]
        );
        this.worksData.positionLink[newId].parentId = newParentId;
      });
      this.addPage(index, page_, undefined, needSelectBG);

      return copyPageRes;
    }
  };

  /**
   * 删除一个页面
   */

  delPage = (pageIdx: number) => {
    const pages = this.getPages();
    if (pages.length <= 1) {
      return;
    }
    const { layers, options } = pages[pageIdx];
    if (options?.enableDelete === false) {
      return;
    }
    const ids: string[] = [];
    deepLayers(layers, item => {
      const { elemId } = item;
      ids.push(elemId);
    });
    delete this.worksData.canvasData.content.pages[pageIdx];
    this.worksData.canvasData.content.pages =
      this.worksData.canvasData.content.pages.filter(Boolean);
    const maxPage = Math.max(pages.length - 1, 0);
    const targetPageIndex = valueInterval(0, maxPage, pageIdx - 1);
    this.setPageIndex(targetPageIndex);
    ids.forEach(id => {
      delete this.worksData.positionLink[id];
    });
  };

  getPageBackground = (index?: number): WorksBackground => {
    const { pageIndex } = this;
    const currentIndex = index == null ? pageIndex : index;
    const worksPage = this.getPage(currentIndex);
    let resBg = worksPage.background || {};
    if (Array.isArray(resBg)) {
      resBg = {};
    }
    return resBg;
  };

  setPageBackground = (
    background: WorksBackground,
    isImgToBackground = false,
    pageIndex?: number,
    needSelectBg = true
  ) => {
    this.takeSnapshotOfData('setPageBackground');
    if (isImgToBackground) {
      this.deleteActiveCompEntity(false);
    }
    const pageIndex_ = pageIndex == null ? this.pageIndex : pageIndex;
    const currBgData = this.getPageBackground(pageIndex_);
    const newData = mergeDeep(currBgData, background);
    if (currBgData) {
      // 如果是没有图片或者颜色，默认把当前的不透明度跳到1
      if (!currBgData.bgpic && !currBgData.bgcolor) {
        newData.opacity = 1;
      }
    }
    this.worksData.canvasData.content.pages[pageIndex_].background = newData;
    this.setData(this.worksData);
  };

  getWidgetState = (widgetId: string) => {
    return toJS(this.widgetState[widgetId] || {});
  };

  /**
   * 修改组件内部状态
   */

  changeWidgetState = (widgetId: string, val: any) => {
    if (!this.widgetState[widgetId]) {
      this.widgetState[widgetId] = {};
    }
    this.widgetState[widgetId] = mergeDeep(this.widgetState[widgetId], val);
  };

  /**
   * 获取 editorSDK
   */
  getEditorSDK = (compEntityId: string): EditorSDK => {
    const self = this;
    return {
      fullSDK: self,
      setWorksStyle: this.setWorksStyle,
      setActivePageIdx: this.setPageIndex,
      setLayerDisableStateBatch: payload => {
        this.setLinkBatch(
          payload.map(item => {
            return {
              elemId: item.compEntityId,
              nextContainerInfo: {
                disabled: item.option.disabled,
              },
            };
          })
        );
      },
      setPageBackground: (pageIdx, background) => {
        this.setPageBackground(background, false, pageIdx);
      },
      getWorksData: () => toJS(this.worksData),
      selectLayer: this.setControlComp,
      getActivePageIdx: () => this.pageIndex,
      didMount: this.onComponentDidMount,
      changeWidgetState: nextVal =>
        this.changeWidgetState(compEntityId, nextVal),
      changeCompAttrMulti: this.changeCompAttrMulti,
      copyPage: this.copyPage,
      getPageData: idx => toJS(this.getPage(idx)),
      getLink: elemId => toJS(this.getLink(elemId)),
      setLinkBatch: this.setLinkBatch,
      addPage: this.addPage,
      delPage: this.delPage,
      setPageOptions: this.setPageOptions,
      changeCompAttr: this.changeCompAttr,
      addComponent: this.addComponent,
      deleteCompEntity: this.deleteCompEntity,
      getLayer: this.getLayer,
      changePageScale: (pIdx, scale) => {
        const currPage = this.getPage(pIdx);
        const dx = scale.width ? scale.width - currPage.width : 0;
        const dy = scale.height ? scale.height - currPage.height : 0;
        this.setPage(pIdx, scale);
        const regionsFollowParent = (
          pageIndex: number,
          dx: number,
          dy: number = 0,
          withFixedLayers = false
        ) => {
          let layers: LayerElemItem[] = [];

          layers = this.getPageLayers(pageIndex, withFixedLayers);
          const { scale } = this;
          const { positionLink } = this.worksData;

          const nextLink: SetLinkBatchParams = [];
          for (const item of layers) {
            let currItemDx = dx;
            let currItemDy = dy;
            const { x, y, constraints = 'LT' } = positionLink[item.elemId];
            if (constraints === 'LT') {
              continue;
            }
            if (constraints === 'LB') {
              currItemDx = 0;
            }
            if (constraints === 'RT') {
              currItemDy = 0;
            }
            const targetX = (x * scale + currItemDx * scale) / scale;
            const targetY = (y * scale + currItemDy * scale) / scale;
            const info = { x: targetX, y: targetY };
            nextLink.push({
              elemId: item.elemId,
              nextContainerInfo: info,
            });
          }
          this.setLinkBatch(nextLink);
        };
        regionsFollowParent(pIdx, dx, dy);
      },
      duplicateComp: this.duplicateComp as any,
      onFormValueChange: nextVal => {
        this.changeCompAttr(compEntityId, nextVal);
      },
      changeContainer: nextVal => {
        this.changeContainerInfoForWidgetEitity(compEntityId, nextVal);
      },
      changePageAndContainer: (nextPageInfo, nextContainerInfo) => {
        this.changeContainerInfoForWidgetEitity(
          nextContainerInfo.id,
          nextContainerInfo.scale
        );
        Object.assign(
          this.worksData.canvasData.content.pages[nextPageInfo.pageIndex],
          nextPageInfo.scale
        );
      },
      getOperatorHandle: () => {
        return this.getOperatorHandle(compEntityId);
      },
      changeOperatorHandle: nextVal => {
        this.changeOperatorHandle(compEntityId, nextVal);
      },
      getStaticResource: info => Promise.resolve(info.url),
      disableDeleteModule: (pageIndex: number, status) => {
        this.setPageOptions(pageIndex, {
          enableDelete: status,
        });
      },
      hasWatermark: () => {
        return this.config.hasWatermark ? this.config.hasWatermark() : true;
      },
      watermarkVersion: () => {
        return this.config.watermarkVersion?.() || '2';
      },
    };
  };
}
