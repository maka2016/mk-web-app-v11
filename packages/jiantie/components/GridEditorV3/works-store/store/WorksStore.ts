import { DesignerConfig, getAppId, getDesignerInfoForClient, getUid } from '@/services';
import { DebounceClass, deepClone, mergeDeep, queryToObj, random, SerializedWorksEntity } from '@/utils';
import { trpc } from '@/utils/trpc';
import { makeAutoObservable, reaction, runInAction, toJS } from 'mobx';
import { themePackV3Manager } from '../../componentForContentLib/ThemeLayoutLibraryV3/services';
import GridOperatorV2 from '../../provider/gridPropsOperator';
import { getCanvaInfo2 } from '../../provider/utils';
import { GridProps, GridState, noTakeTag, ThemeConfigV2 } from '../../utils';
import { ThemePackV3Operator } from '../themePackV3Operator';
import { AddComponentParams, IMusic, IWorksData, LayerElemItem } from '../types/interface';
import { getDefaultWorksData } from '../utils';
import { IWorksStoreConfig } from './config';
import { UndoManager } from './undoManager';
export * from './undoManager';

const autoSaverDebounce = new DebounceClass();
// 每个 WorksStore 实例使用独立的 debounce 实例，避免不同实例之间的干扰
// 注意：这个 debounce 实例需要在 WorksStore 实例中创建，而不是在模块级别

function removeUndefinedKeys(style: any): any {
  Object.keys(style).forEach(key => {
    const val = style[key as keyof typeof style];
    if (val === undefined || val === null) {
      Reflect.deleteProperty(style, key as keyof typeof style);
    }
  });
  return style;
}

class SaveError extends Error {
  name = 'SaveError';

  constructor(message: string) {
    super(message);
    console.log(message);
  }
}

export type WorksStoreConfig = IWorksStoreConfig;

/**
 * 编辑器运行时状态管理器
 * 范围：编辑器运行时状态的增删查改
 */
export class WorksStore {
  worksData!: IWorksData;

  config: IWorksStoreConfig = {
    autoSaveFreq: -1,
    noSave: false,
    readonly: false,
    worksId: () => '',
    isTemplate: false,
    version: undefined,
    worksData: undefined,
    worksDetail: undefined,
  };

  /** 组件内部状态 */
  widgetState: Record<string, any> = {};

  widgetStateV2: GridState = {
    hideOperator: true,
    onlyRenderActiveBlock: true,
    activeRowDepth: [0],
  };

  /** 撤销重做管理器 */
  undoManager: UndoManager;

  /** 用于触发 undo/redo 状态更新的版本号 */
  private undoRedoVersion = 0;
  /** 应用是否已准备好渲染所需要的数据 */
  isAppReady = false;
  isSaved = false;
  saveError = false;
  focusUpdateVersion = 1;
  worksDetail = {} as SerializedWorksEntity;
  gridPropsOperator: GridOperatorV2;
  themePackV3Operator: ThemePackV3Operator;

  inEditor!: boolean;
  inViewer!: boolean;

  /** 设计师信息 */
  designerInfo: DesignerConfig & {
    fetching: boolean;
  } = {
    fetching: false,
    isDesigner: false,
    uid: 0,
    appid: '',
    fullName: '',
    roles: [],
  };

  get fullStack() {
    return /2|dev/.test(queryToObj().designer_tool);
  }

  get isTemplate() {
    return this.config.isTemplate;
  }

  updateWorksDetailPurely = (data: Partial<SerializedWorksEntity>) => {
    this.worksDetail = {
      ...this.worksDetail,
      ...data,
    };
  };

  api = {
    /** 延迟保存 */
    saveWorksDebounce: () => {
      const { autoSaveFreq, noSave = false, readonly } = this.config;
      return new Promise((resolve, reject) => {
        if (noSave || readonly) {
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

    updateWorksDetail: async (data: Partial<SerializedWorksEntity>) => {
      const { worksId, isTemplate } = this.config;
      if (isTemplate) {
        // throw new Error('模版不能保存');
        if (data.title) {
          trpc.template.update.mutate({
            id: worksId(),
            title: data.title,
          });
          return;
        } else {
          throw new Error('模版只能修改标题');
        }
      }

      // 过滤掉 null 值，tRPC update 不接受 null
      const cleanData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });

      this.updateWorksDetailPurely({
        ...data,
      });
      return trpc.works.update.mutate({
        id: worksId(),
        ...cleanData,
      }) as any;
    },

    /** 立即保存 */
    saveWorks: async (type: 'auto' | 'manual') => {
      const { worksId, isTemplate, noSave, readonly } = this.config;
      if (noSave || queryToObj().no_save || readonly) {
        console.log('noSave', this.getSaveData());
        throw new Error('noSave');
      }

      try {
        const saveData = {
          id: worksId(),
          content: this.getSaveData(),
          isBackup: type === 'manual',
        };

        let saveRes;
        if (isTemplate) {
          saveRes = await trpc.template.saveTemplateContent.mutate(saveData);
        } else {
          saveRes = await trpc.works.saveWorksContent.mutate(saveData);
        }

        runInAction(() => {
          this.worksDetail.version = Number(saveRes.version);
          this.isSaved = true;
          this.saveError = false;
        });
      } catch (err) {
        const _err: any = err;
        runInAction(() => {
          this.saveError = true;
        });
        throw new SaveError(`保存失败: ${_err.message || _err}`);
      }
    },

    getWorksData: async (): Promise<{
      work_data: IWorksData;
      detail: any;
    }> => {
      const { worksId, isTemplate = false, version } = this.config;
      const pageId = worksId();
      const v = version?.();

      try {
        let result: {
          detail: SerializedWorksEntity;
          work_data: IWorksData | null;
        } = { detail: {} as SerializedWorksEntity, work_data: null };

        if (isTemplate) {
          result = (await trpc.template.getTemplateData.query({
            id: pageId,
          })) as any;
          if (result.detail) {
            this.worksDetail = result.detail;
            this.worksDetail.uid = result.detail.uid;
          }
        } else {
          result = (await trpc.works.getWorksData.query({
            id: pageId,
            version: v,
          })) as any;
          this.worksDetail = result.detail;
        }

        return {
          work_data: result.work_data as IWorksData,
          detail: result.detail,
        };
      } catch (e: any) {
        console.log('获取作品数据失败', e);
        throw new Error(e?.message || '获取作品数据失败');
      }
    },
  };

  constructor(props: WorksStoreConfig) {
    const { worksId, readonly } = props;
    if (!worksId()) {
      throw new Error('worksId 不能为空');
    }
    this.inEditor = !readonly;
    this.inViewer = !!readonly;
    Object.assign(this.config, props);

    this.worksData = props.worksData || getDefaultWorksData();
    this.worksDetail = props.worksDetail || ({} as SerializedWorksEntity);

    if (typeof window !== 'undefined') {
      Object.assign(window as any, { getThemeConfig: this.getThemeConfig });
    }

    // 初始化撤销重做管理器
    this.undoManager = new UndoManager();

    this.gridPropsOperator = new GridOperatorV2();
    this.gridPropsOperator.getGridsData = this.getGridsData;
    this.gridPropsOperator.getWidgetState = this.getWidgetStateV2;
    this.gridPropsOperator.editorSDK = this;

    this.themePackV3Operator = new ThemePackV3Operator();

    if (!readonly) {
      makeAutoObservable(this, {
        api: false,
        undoManager: false,
        themePackV3Operator: false,
      });
    }
  }

  getThemeConfig = () => {
    return this.worksData.gridProps.themeConfig2;
  };

  getCanvaInfo = () => {
    return getCanvaInfo2(this.worksDetail);
  };

  getGridsData = () => {
    return this.worksData.gridProps.gridsData;
  };

  getWidgetStateV2 = () => {
    return this.widgetStateV2;
  };

  /**
   * 是否可以撤销
   * 通过访问 undoRedoVersion 确保响应式更新
   */
  get isUndoable() {
    // 访问 undoRedoVersion 以确保响应式
    void this.undoRedoVersion;
    return this.undoManager.isUndoable();
  }

  /**
   * 是否可以重做
   * 通过访问 undoRedoVersion 确保响应式更新
   */
  get isRedoable() {
    // 访问 undoRedoVersion 以确保响应式
    void this.undoRedoVersion;
    return this.undoManager.isRndoable();
  }

  /**
   * 触发 undo/redo 状态更新
   */
  private triggerUndoRedoUpdate = () => {
    this.undoRedoVersion += 1;
  };

  /**
   * 获取持久化存储的 key
   */
  private getWidgetStateStorageKey = (): string => {
    const worksId = this.config.worksId?.();
    return `widgetStateV2_${worksId || 'default'}`;
  };

  /**
   * 保存 widgetStateV2 到 localStorage
   */
  private saveWidgetStateV2ToStorage = () => {
    if (typeof window === 'undefined') return;

    try {
      // 只持久化需要保留的状态，过滤掉临时状态
      const persistentState: Partial<GridState> = {
        // activeRowDepth: this.widgetStateV2.activeRowDepth,
        onlyRenderActiveBlock: this.widgetStateV2.onlyRenderActiveBlock,
        hideOperator: this.widgetStateV2.hideOperator,
        showMobilePreviewLine: this.widgetStateV2.showMobilePreviewLine,
        // playAnimationInEditor: this.widgetStateV2.playAnimationInEditor,
      };

      const storageKey = this.getWidgetStateStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(persistentState));
    } catch (error) {
      console.error('保存 widgetStateV2 到 localStorage 失败:', error);
    }
  };

  /**
   * 从 localStorage 恢复 widgetStateV2
   */
  private loadWidgetStateV2FromStorage = (): Partial<GridState> | null => {
    if (typeof window === 'undefined') return null;

    try {
      const storageKey = this.getWidgetStateStorageKey();
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as Partial<GridState>;
      }
    } catch (error) {
      console.error('从 localStorage 读取 widgetStateV2 失败:', error);
    }

    return null;
  };

  setWidgetStateV2 = (nextWidgetState: GridState) => {
    this.widgetStateV2 = mergeDeep(this.widgetStateV2, nextWidgetState);
    // 保存到 localStorage
    this.saveWidgetStateV2ToStorage();
  };

  clearActiveStatus = () => {
    this.setWidgetStateV2({
      activeRowDepth: [this.widgetStateV2.activeRowDepth?.[0] || 0],
      editingElemId: undefined,
      hideOperator: true,
    });
  };

  cleanWorksData = (workData: IWorksData) => {
    Object.keys(workData.layersMap).forEach(key => {
      const item = workData.layersMap[key];
      if (key !== item.elemId) {
        workData.layersMap[item.elemId] = item;
        delete workData.layersMap[key];
      }
    });
    return workData;
  };

  private initWidgetState = (worksDetail: SerializedWorksEntity) => {
    // 从 localStorage 恢复持久化的状态
    const savedState = this.loadWidgetStateV2FromStorage();
    if (savedState) {
      // 合并保存的状态，但保留默认值
      this.widgetStateV2 = mergeDeep(this.widgetStateV2, savedState);
    } else if (worksDetail.specInfo.is_flat_page) {
      this.widgetStateV2.onlyRenderActiveBlock = false;
    }
  };

  /**
   * 初始化设计师信息
   */
  initDesignerInfo = async () => {
    if (this.fullStack) {
      runInAction(() => {
        this.designerInfo.fetching = true;
      });

      try {
        const res = await getDesignerInfoForClient({
          uid: getUid(),
          appid: getAppId(),
        });

        res.isDesigner = true;

        runInAction(() => {
          this.designerInfo = {
            ...res,
            fetching: false,
          };
        });
      } catch (error) {
        console.error('获取设计师信息失败:', error);
        runInAction(() => {
          this.designerInfo.fetching = false;
        });
      }
    }
  };

  initThemePackV3Operator = async () => {
    const { gridProps } = this.worksData;
    const canUpdate = !gridProps.themePackV3RefId; // 如果关联了主题包，则不能更新主题包数据

    // 如果是主题模式（gridProps.themePackV3），使用当前作品的数据，无需重复加载
    if (gridProps.themePackV3) {
      const themePackV3RefId = {
        documentId: gridProps.themePackV3.documentId,
        worksId: this.worksDetail.id,
      };
      const [themePackV3Res] = await Promise.all([themePackV3Manager.getItem(themePackV3RefId.documentId)]);

      this.themePackV3Operator.init(themePackV3RefId, canUpdate, {
        worksData: this.worksData,
        worksDetail: this.worksDetail,
        componentContent: themePackV3Res.content,
      });

      // 主题模式下，数据已经是最新的，无需更新 gridProps
      return;
    }

    // 如果是关联主题模式（gridProps.themePackV3RefId），需要从 API 加载关联的主题包数据
    if (gridProps.themePackV3RefId) {
      this.themePackV3Operator.setLoading(true);

      try {
        const [worksDataRes, themePackV3Res] = await Promise.all([
          trpc.works.getWorksData.query({
            id: gridProps.themePackV3RefId.worksId,
          }),
          themePackV3Manager.getItem(gridProps.themePackV3RefId.documentId),
        ]);

        const worksDataFromThemePack = worksDataRes.work_data as IWorksData;

        this.themePackV3Operator.init(gridProps.themePackV3RefId, canUpdate, {
          worksData: worksDataFromThemePack,
          worksDetail: worksDataRes.detail as any,
          componentContent: themePackV3Res.content,
        });

        // 如果是关联了主题，则使用主题包作品的风格和素材库
        const gridPropsFromWorks = worksDataFromThemePack.gridProps;
        if (gridPropsFromWorks) {
          this.setGridProps({
            materialResourcesGroup: gridPropsFromWorks.materialResourcesGroup,
            themeConfig2: gridPropsFromWorks.themeConfig2,
            _updateVersion: (gridProps._updateVersion || 0) + 1,
          });
        }
      } catch (error) {
        console.error('加载主题包数据失败:', error);
        this.themePackV3Operator.setLoading(false);
        throw error;
      }
    }
  };

  /**
   * 数据准备入口
   * @returns
   */
  prepareData = async () => {
    const { autoSaveFreq, worksData, worksDetail } = this.config;
    if (worksData && worksDetail) {
      // 如果传入了 worksData 和 worksDetail，则直接初始化数据
      await this.initData(worksData);
      this.initWidgetState(worksDetail);
    } else {
      // 如果没传入 worksData 和 worksDetail，则通过api获取作品数据和作品详情
      const worksRes = await this.api.getWorksData();
      const workData = this.cleanWorksData(worksRes.work_data);
      await this.initData(workData);
      this.initWidgetState(worksRes.detail);
    }

    // 初始化设计师信息
    await this.initDesignerInfo();

    // 初始化主题包数据
    await this.initThemePackV3Operator();

    if (autoSaveFreq > 0) {
      this.runAutoSave();
    }

    return this.worksData;
  };

  /** 自动保存 reaction 的清理函数 */
  private autoSaveDisposer?: () => void;

  /** undo/redo 快照 reaction 的清理函数 */
  private undoSnapshotDisposer?: () => void;

  /** 是否正在执行 undo/redo 操作，用于避免在 undo/redo 时记录快照 */
  private isUndoRedoing = false;

  /** undo/redo 操作的时间戳，用于在节流回调中检查是否刚刚执行了 undo/redo */
  private lastUndoRedoTimestamp = 0;

  /** undo/redo 快照节流实例（每个实例独立） */
  private undoSnapshotDebounce = new DebounceClass();

  handleAutoSave = async () => {
    try {
      await this.api.saveWorksDebounce();
    } catch (err) {
      console.log('保存失败', err);
      runInAction(() => {
        this.saveError = true;
      });
    }
  };

  /**
   * 启动自动保存监听
   * 最佳实践：
   * 1. 保存清理函数，避免内存泄漏和重复创建 reaction
   * 2. 使用 reaction 监听数据变化，只在值真正改变时触发保存
   * 3. 使用 toJS 转换为普通对象，确保能捕获所有嵌套属性的变化
   * 4. 配合防抖机制（saveWorksDebounce），避免频繁保存
   *
   * 注意：虽然 toJS 有性能开销，但由于保存本身已经防抖（autoSaveFreq * 1000ms），
   * 且只在数据变化时执行，性能影响可以接受。这样可以确保捕获所有深层嵌套的数据变化。
   */
  private runAutoSave = () => {
    // 如果已经存在清理函数，先清理旧的 reaction，避免重复创建和内存泄漏
    if (this.autoSaveDisposer) {
      this.autoSaveDisposer();
      this.autoSaveDisposer = undefined;
    }

    // 使用 reaction 监听 worksData 的变化
    // tracking 函数：将 observable 转换为普通对象，用于比较
    // effect 函数：当数据变化时触发自动保存
    this.autoSaveDisposer = reaction(
      () => toJS(this.worksData),
      () => {
        // 只在应用就绪时才执行保存，避免初始化时触发不必要的保存
        if (this.isAppReady) {
          this.handleAutoSave();
        }
      },
      {
        // 不立即执行，等待数据变化后再触发
        fireImmediately: false,
      }
    );
  };

  /**
   * 启动 undo/redo 快照监听
   * 使用 reaction 监听 worksData 变化，200ms 节流记录快照
   */
  private startUndoSnapshotListener = () => {
    // 如果已经存在清理函数，先清理旧的 reaction
    if (this.undoSnapshotDisposer) {
      this.undoSnapshotDisposer();
      this.undoSnapshotDisposer = undefined;
    }

    // 使用 reaction 监听 worksData 的变化
    this.undoSnapshotDisposer = reaction(
      () => toJS(this.worksData),
      () => {
        // 如果正在执行 undo/redo，不记录快照
        if (this.isUndoRedoing) {
          return;
        }

        // 如果应用未就绪，不记录快照
        if (!this.isAppReady) {
          return;
        }

        // 使用 200ms 节流记录快照
        this.undoSnapshotDebounce.exec(() => {
          // 再次检查，避免在节流期间状态变化
          // 如果正在执行 undo/redo，或者应用未就绪，或者在 undo/redo 后的 500ms 内，则不记录快照
          const now = Date.now();
          const timeSinceLastUndoRedo = now - this.lastUndoRedoTimestamp;
          const isRecentUndoRedo = timeSinceLastUndoRedo < 500; // 500ms 内的 undo/redo 操作

          if (this.isUndoRedoing || !this.isAppReady || isRecentUndoRedo) {
            return;
          }

          // 检查当前数据是否与栈顶快照相同
          // 如果相同，说明这是 undo/redo 操作的结果，不应该记录新快照
          const currentData = toJS(this.worksData) as any;
          const lastSnapshot = this.undoManager.storeTimelineStack[this.undoManager.storeTimelineStack.length - 1];
          const isSameAsLastSnapshot =
            lastSnapshot && JSON.stringify(lastSnapshot.dataSnapshot) === JSON.stringify(currentData);

          // 如果当前数据与栈顶快照相同，说明这是 undo/redo 操作的结果，不应该记录新快照
          if (isSameAsLastSnapshot) {
            return;
          }

          this.undoManager.record(
            {
              actionName: '编辑',
              dataSnapshot: currentData,
            },
            this.isUndoRedoing // 传递 WorksStore 的 isUndoRedoing 标志
          );

          // 触发 undo/redo 状态更新
          this.triggerUndoRedoUpdate();
        }, 200);
      },
      {
        // 不立即执行，等待数据变化后再触发
        fireImmediately: false,
      }
    );
  };

  initData = async (data: IWorksData, config?: Partial<WorksStoreConfig>) => {
    if (config) {
      Object.assign(this.config, config);
    }
    this.setDataWithoutUndo(data);

    // 设置作品 ID 并恢复历史记录
    const worksId = this.config.worksId?.();
    if (worksId) {
      await this.undoManager.setWorksId(worksId);
      // 如果没有恢复到历史记录，则创建初始快照
      if (!this.undoManager.isUndoable()) {
        this.undoManager.record({
          actionName: '初始化',
          dataSnapshot: toJS(this.worksData) as any,
        });
      }
    } else {
      // 没有 worksId，直接创建初始快照
      this.undoManager.record({
        actionName: '初始化',
        dataSnapshot: toJS(this.worksData) as any,
      });
    }

    // 启动 undo/redo 快照监听
    this.startUndoSnapshotListener();

    this.isAppReady = true;
  };

  redo = () => {
    // 取消所有待执行的节流回调，避免在 undo/redo 之后错误记录快照
    this.undoSnapshotDebounce.cancel();

    // 记录 undo/redo 操作的时间戳
    this.lastUndoRedoTimestamp = Date.now();

    // 设置标志，避免在 undo/redo 时记录快照（必须在调用 undoManager.redo() 之前设置）
    this.isUndoRedoing = true;

    const redoStore = this.undoManager.redo();
    if (!redoStore) {
      this.isUndoRedoing = false;
      return;
    }

    try {
      // 使用 runInAction 确保数据更新的原子性
      runInAction(() => {
        // 使用 setDataWithoutUndo，因为 redo 不应该创建新快照
        this.setDataWithoutUndo(redoStore.dataSnapshot);
        this.focusUpdateVersion += 1;
      });

      this.triggerUndoRedoUpdate();
    } finally {
      // 延迟重置标志，确保 reaction 不会在数据更新期间触发
      // 延迟时间需要大于节流时间（200ms）+ 一些缓冲
      setTimeout(() => {
        this.isUndoRedoing = false;
      }, 300); // 增加到 300ms，确保超过节流时间 200ms
    }
  };

  undo = () => {
    // 取消所有待执行的节流回调，避免在 undo/redo 之后错误记录快照
    this.undoSnapshotDebounce.cancel();

    // 记录 undo/redo 操作的时间戳
    this.lastUndoRedoTimestamp = Date.now();

    // 设置标志，避免在 undo/redo 时记录快照（必须在调用 undoManager.undo() 之前设置）
    this.isUndoRedoing = true;

    const undoStore = this.undoManager.undo();
    if (!undoStore) {
      this.isUndoRedoing = false;
      return;
    }

    try {
      // 使用 runInAction 确保数据更新的原子性
      runInAction(() => {
        // 使用 setDataWithoutUndo，因为 undo 不应该创建新快照
        this.setDataWithoutUndo(undoStore.dataSnapshot);
        this.focusUpdateVersion += 1;
      });

      this.triggerUndoRedoUpdate();
    } finally {
      // 延迟重置标志，确保 reaction 不会在数据更新期间触发
      // 延迟时间需要大于节流时间（200ms）+ 一些缓冲
      setTimeout(() => {
        this.isUndoRedoing = false;
      }, 300); // 增加到 300ms，确保超过节流时间 200ms
    }
  };

  /**
   * 跳转到指定的历史状态
   * @param targetIndex 目标状态的索引
   */
  jumpToHistory = (targetIndex: number) => {
    // 取消所有待执行的节流回调，避免在 jumpTo 之后错误记录快照
    this.undoSnapshotDebounce.cancel();

    // 记录 undo/redo 操作的时间戳
    this.lastUndoRedoTimestamp = Date.now();

    // 设置标志，避免在 jumpTo 时记录快照（必须在调用 undoManager.jumpTo() 之前设置）
    this.isUndoRedoing = true;

    const targetStore = this.undoManager.jumpTo(targetIndex);
    if (!targetStore) {
      this.isUndoRedoing = false;
      return;
    }

    try {
      // 使用 setDataWithoutUndo，因为 jumpTo 不应该创建新快照
      this.setDataWithoutUndo(targetStore.dataSnapshot);
      this.focusUpdateVersion += 1;
      this.triggerUndoRedoUpdate();
    } finally {
      // 延迟重置标志，确保 reaction 不会在数据更新期间触发
      setTimeout(() => {
        this.isUndoRedoing = false;
      }, 300); // 增加到 300ms，确保超过节流时间 200ms
    }
  };

  /**
   * 获取历史记录列表
   * @param maxCount 最大返回数量，默认 20
   */
  getHistory = (maxCount = 20) => {
    return this.undoManager.getHistory(maxCount);
  };

  /**
   * 获取当前状态的索引
   */
  getCurrentHistoryIndex = () => {
    return this.undoManager.getCurrentIndex();
  };

  setMusic = (music: IMusic) => {
    this.worksData.music = music;
  };

  getStyleByTag2 = (tag: keyof ThemeConfigV2, targetStyle: React.CSSProperties = {}) => {
    if (noTakeTag.includes(tag)) {
      return targetStyle;
    }
    const themeConfig = this.worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);
    return {
      ...(themeConfig[tag] || {}),
      ...removeUndefinedKeys(toJS(targetStyle)),
    };
  };

  /**
   * setData 不带撤销
   * 使用 runInAction 确保原子性，避免触发不必要的副作用
   */
  protected setDataWithoutUndo = (nextData: IWorksData) => {
    runInAction(() => {
      this.worksData = nextData;
    });
  };

  /**
   * 获取保存数据
   */
  getSaveData = () => {
    return toJS(this.worksData);
  };

  getLayer = (compEntityId: string) => {
    return this.worksData.layersMap[compEntityId];
  };

  getLayers = (compEntityId: string[]) => compEntityId.map(id => this.worksData.layersMap[id]);

  /**
   * 计算组件属性版本号
   * @param newVersion 新传入的版本号
   * @param currentVersion 当前版本号
   * @returns 确保返回有效的数字版本号
   */
  private getNextVersion = (newVersion: any): number => {
    if (typeof +newVersion === 'number' && !isNaN(+newVersion)) return +newVersion + 1;
    return 1;
  };

  changeCompAttr = (
    compEntityId: string,
    nextAttrs: Record<string, any> = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _takeSnapshot: boolean | string = true, // 保留参数以保持 API 兼容性，但不再使用（由 reaction 自动记录快照）
    replace?: boolean
  ) => {
    const layer = this.worksData.layersMap[compEntityId];
    if (layer) {
      const commitAttrs = replace
        ? {
            ...nextAttrs,
            // 内置version追踪器
            _v: this.getNextVersion(nextAttrs._v || layer.attrs._v),
          }
        : mergeDeep(layer.attrs, {
            ...nextAttrs,
            // 内置version追踪器
            _v: this.getNextVersion(nextAttrs._v || layer.attrs._v),
          });

      this.worksData.layersMap[compEntityId].attrs = commitAttrs;
    }

    // 不再手动调用 takeSnapshotOfData，由 reaction 自动监听 worksData 变化并记录快照
  };

  duplicateComp = (targetId: string | string[]) => {
    const targetLayers = this.getLayers(Array.isArray(targetId) ? targetId : [targetId]);
    const newLayerIds: string[] = [];
    for (let index = 0; index < targetLayers.length; index++) {
      const newLayer = deepClone(targetLayers[index]);
      newLayer.elemId = random();
      this.addComponent(newLayer);
      newLayerIds.push(newLayer.elemId);
    }
    return newLayerIds;
  };

  setLayer = (elemId: string, layer: Partial<LayerElemItem>) => {
    this.worksData.layersMap[elemId] = mergeDeep(this.worksData.layersMap[elemId] || {}, layer);
  };

  deleteCompEntity = (compEntityId: string | string[]) => {
    if (compEntityId instanceof Array) {
      compEntityId.forEach(id => Reflect.deleteProperty(this.worksData.layersMap, id));
    } else {
      Reflect.deleteProperty(this.worksData.layersMap, compEntityId);
    }
  };

  addComponent = (eleItem: AddComponentParams) => {
    const { elemId = random(), type = 'element' } = eleItem;
    const pushItem = { ...eleItem } as LayerElemItem;

    pushItem.elemId = elemId;
    pushItem.type = type;

    this.worksData.layersMap[elemId] = pushItem;

    return elemId;
  };

  /**
   * 修改组件内部状态
   */
  changeWidgetState = (val: any) => {
    this.widgetState = mergeDeep(this.widgetState, val);
  };

  setGridProps = (nextVal: Partial<GridProps>) => {
    this.worksData.gridProps = mergeDeep(this.worksData.gridProps, nextVal);
  };
}
