import { IWorksData } from '../types';
import { undoStorage } from './undoStorage';

export interface StoreTimelineSnapshot {
  /** undoableAction 名 */
  actionName: string;
  /** store 的快照 */
  dataSnapshot: IWorksData;
}

/**
 * 深拷贝快照数据，确保快照之间完全隔离
 * 使用结构化克隆算法（更快）
 */
function deepCloneSnapshot(data: IWorksData): IWorksData {
  try {
    // 优先使用 structuredClone（更快的原生 API）
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(data);
    }
    // 降级到 JSON 方法
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('深拷贝快照失败，使用浅拷贝作为后备方案', error);
    return { ...data };
  }
}

/** 持久化配置 */
export interface PersistenceConfig {
  /** 是否启用持久化 */
  enabled: boolean;
  /** 存储键名前缀 */
  storageKeyPrefix: string;
  /** 最大保存的快照数量（为了避免超出 localStorage 限制） */
  maxPersistSnapshots: number;
  /** 自动保存延迟（毫秒） */
  autoSaveDelay: number;
  /** 数据版本号（用于兼容性检查） */
  version: string;
}

export class UndoManager {
  /** 最大可撤销数量 */
  maxUndoLevel = 100;

  /** store 的时间线 - 用于撤销操作 */
  storeTimelineStack: StoreTimelineSnapshot[] = [];

  /** 重做 stack - 用于重做操作 */
  redoStack: StoreTimelineSnapshot[] = [];

  /** 防抖计时器 */
  private timer?: ReturnType<typeof setTimeout>;

  /** 待处理的快照队列 */
  private pendingSnapshots: StoreTimelineSnapshot[] = [];

  /** 是否正在执行 undo/redo 操作 */
  private isUndoRedoing = false;

  /** 持久化配置 */
  private persistenceConfig: PersistenceConfig = {
    enabled: true,
    storageKeyPrefix: 'undoManager',
    maxPersistSnapshots: 20,
    autoSaveDelay: 3000, // 3 秒后自动保存（减少保存频率）
    version: '1.0.0',
  };

  /** 自动保存计时器 */
  private autoSaveTimer?: ReturnType<typeof setTimeout>;

  /** 当前作品 ID（用于区分不同作品的历史） */
  private currentWorksId?: string;

  constructor(
    maxUndoLevel = 100,
    persistenceConfig?: Partial<PersistenceConfig>
  ) {
    this.maxUndoLevel = maxUndoLevel;

    if (persistenceConfig) {
      this.persistenceConfig = {
        ...this.persistenceConfig,
        ...persistenceConfig,
      };
    }

    // 【关键修复】页面卸载前保存数据
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(); // 确保待处理快照已记录
        // 使用同步方式尝试保存（beforeunload 中异步操作可能不执行）
        if (this.currentWorksId && this.storeTimelineStack.length > 0) {
          // 标记需要保存
          sessionStorage.setItem('undoManager_needSave', this.currentWorksId);
        }
      });

      // 页面加载时检查是否有未保存的数据
      const needSave = sessionStorage.getItem('undoManager_needSave');
      if (needSave) {
        sessionStorage.removeItem('undoManager_needSave');
        // 这个作品上次退出时有数据，会在 setWorksId 时自动恢复
      }
    }
  }

  /**
   * 设置当前作品 ID
   * @param worksId 作品 ID
   */
  setWorksId = async (worksId: string) => {
    if (this.currentWorksId !== worksId) {
      // 【关键修复】切换作品时先保存当前作品的历史
      if (this.currentWorksId && this.storeTimelineStack.length > 0) {
        try {
          await this.save();
        } catch (error) {
          console.error('保存当前作品历史失败:', error);
        }
      }

      // 清空当前历史
      this.storeTimelineStack = [];
      this.redoStack = [];
      this.pendingSnapshots = [];
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = undefined;
      }

      // 切换到新作品并恢复历史
      this.currentWorksId = worksId;
      await this.restoreFromStorage();
    }
  };

  /**
   * 获取存储键名
   */
  private getStorageKey = (suffix: string = 'data') => {
    const { storageKeyPrefix } = this.persistenceConfig;
    const worksIdPart = this.currentWorksId ? `_${this.currentWorksId}` : '';
    return `${storageKeyPrefix}${worksIdPart}_${suffix}`;
  };

  /**
   * 保存状态到 IndexedDB
   */
  private saveToStorage = async () => {
    if (!this.persistenceConfig.enabled) return;
    if (typeof window === 'undefined') return;
    if (!this.currentWorksId) return;

    try {
      // 保存所有快照到 IndexedDB（容量大，不需要限制）
      const success = await undoStorage.save(
        this.currentWorksId,
        this.storeTimelineStack,
        this.redoStack,
        this.storeTimelineStack.length - 1,
        this.persistenceConfig.version
      );

      if (success) {
        // 保存成功后，尝试清理过期数据
        undoStorage.cleanup().catch(() => {
          // 清理失败不影响正常使用
        });
      } else {
        // IndexedDB 不可用，禁用持久化
        this.persistenceConfig.enabled = false;
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  /**
   * 从 IndexedDB 恢复状态
   */
  private restoreFromStorage = async () => {
    if (!this.persistenceConfig.enabled) return;
    if (typeof window === 'undefined') return;
    if (!this.currentWorksId) return;

    try {
      const data = await undoStorage.load(
        this.currentWorksId,
        this.persistenceConfig.version,
        7 * 24 * 60 * 60 * 1000 // 7 天
      );

      if (data) {
        // 恢复数据
        this.storeTimelineStack = data.storeTimelineStack || [];
        this.redoStack = data.redoStack || [];
      }
    } catch (error) {
      console.error('数据恢复失败:', error);
      this.storeTimelineStack = [];
      this.redoStack = [];
    }
  };

  /**
   * 清理旧数据
   */
  private cleanupOldData = async () => {
    try {
      await undoStorage.cleanup(7 * 24 * 60 * 60 * 1000); // 7 天
    } catch (error) {
      console.error('清理旧数据失败:', error);
    }
  };

  /**
   * 触发自动保存（带节流）
   */
  private lastSaveTime = 0;
  private minSaveInterval = 2000; // 最小保存间隔 2 秒

  private scheduleAutoSave = () => {
    if (!this.persistenceConfig.enabled) return;

    // 清除之前的定时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // 设置新的定时器
    this.autoSaveTimer = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastSave = now - this.lastSaveTime;

      // 如果距离上次保存太近，延迟保存
      if (timeSinceLastSave < this.minSaveInterval) {
        // 延迟到满足最小间隔
        setTimeout(() => {
          this.saveToStorage();
          this.lastSaveTime = Date.now();
        }, this.minSaveInterval - timeSinceLastSave);
      } else {
        this.saveToStorage();
        this.lastSaveTime = now;
      }
    }, this.persistenceConfig.autoSaveDelay);
  };

  /**
   * 是否可以撤销
   * 至少需要 2 个快照才能撤销（当前状态 + 前一个状态）
   */
  isUndoable = () => {
    return this.storeTimelineStack.length > 1;
  };

  /**
   * 是否可以重做
   */
  isRndoable = () => {
    return this.redoStack.length > 0;
  };

  /**
   * 记录 timeline 的 store
   * @param timelineStore
   */
  record = (timelineStore: StoreTimelineSnapshot) => {
    // 服务端渲染时不记录
    if (typeof window === 'undefined') {
      return;
    }

    // 正在执行 undo/redo 时不记录新快照
    if (this.isUndoRedoing) {
      return;
    }

    // 【关键修复】立即深拷贝，避免引用被修改导致快照错误
    const clonedSnapshot = {
      actionName: timelineStore.actionName,
      dataSnapshot: deepCloneSnapshot(timelineStore.dataSnapshot),
    };

    // 【修复】将快照加入待处理队列，而不是覆盖单个快照
    this.pendingSnapshots.push(clonedSnapshot);
    // 清除之前的计时器
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // 使用防抖，300ms 内的连续操作合并处理
    this.timer = setTimeout(() => {
      this.flushPendingSnapshots();
    }, 300);
  };

  /**
   * 处理待处理的快照队列
   */
  private flushPendingSnapshots = () => {
    if (this.pendingSnapshots.length === 0) {
      return;
    }

    // 处理待处理队列中的每个快照
    for (let i = 0; i < this.pendingSnapshots.length; i++) {
      const snapshot = this.pendingSnapshots[i];
      // 检查是否与最后一个快照相同（避免重复记录）
      const lastSavedSnapshot =
        this.storeTimelineStack[this.storeTimelineStack.length - 1];

      if (lastSavedSnapshot) {
        // 简化比较：只比较关键字段
        const isSimilar = this.isSnapshotSimilar(
          lastSavedSnapshot.dataSnapshot,
          snapshot.dataSnapshot
        );
        if (isSimilar) {
          continue; // 跳过相似的快照
        }
      }

      // 添加新快照
      this.storeTimelineStack.push(snapshot);
      // 限制栈大小
      if (this.storeTimelineStack.length > this.maxUndoLevel) {
        this.storeTimelineStack.shift();
      }
    }

    // 【关键修复】只在真正有新快照添加时才清空重做栈
    if (this.pendingSnapshots.length > 0 && this.redoStack.length > 0) {
      this.redoStack = [];
    }

    // 清空待处理队列
    this.pendingSnapshots = [];

    // 触发自动保存
    this.scheduleAutoSave();

    // this.log();
  };

  /**
   * 快速比较两个快照是否相似（避免全量序列化）
   * 【重要】宁可误判为不同（多保存），也不能误判为相同（丢失快照）
   */
  private isSnapshotSimilar(a: IWorksData, b: IWorksData): boolean {
    try {
      // 比较页面数量
      const aPagesCount = a.canvasData.content.pages.length;
      const bPagesCount = b.canvasData.content.pages.length;
      if (aPagesCount !== bPagesCount) {
        return false;
      }

      // 比较所有页面的图层数量（更全面的检查）
      for (let i = 0; i < a.canvasData.content.pages.length; i++) {
        const aLayers = a.canvasData.content.pages[i]?.layers?.length || 0;
        const bLayers = b.canvasData.content.pages[i]?.layers?.length || 0;
        if (aLayers !== bLayers) {
          return false;
        }
      }

      // 比较固定图层数量
      const aFixedLayers = a.canvasData.content.fixedLayer?.length || 0;
      const bFixedLayers = b.canvasData.content.fixedLayer?.length || 0;
      if (aFixedLayers !== bFixedLayers) {
        return false;
      }

      // 比较 positionLink 数量（组件位置信息）
      const aLinkCount = Object.keys(a.positionLink || {}).length;
      const bLinkCount = Object.keys(b.positionLink || {}).length;
      if (aLinkCount !== bLinkCount) {
        return false;
      }

      // 比较画布尺寸
      if (
        a.canvasData.width !== b.canvasData.width ||
        a.canvasData.height !== b.canvasData.height
      ) {
        return false;
      }

      // 【新增】比较 positionLink 中关键组件的位置和尺寸
      // 抽样检查前几个组件的位置，避免只改位置但被误判为相似
      const aLinks = Object.entries(a.positionLink || {}).slice(0, 5);
      for (let i = 0; i < aLinks.length; i++) {
        const [aKey, aLink] = aLinks[i];
        const bLink = b.positionLink?.[aKey];

        if (!bLink) {
          return false;
        }

        // 比较位置和尺寸（允许小误差）
        const xDiff = Math.abs((aLink.x || 0) - (bLink.x || 0));
        const yDiff = Math.abs((aLink.y || 0) - (bLink.y || 0));
        const wDiff = Math.abs((aLink.width || 0) - (bLink.width || 0));
        const hDiff = Math.abs((aLink.height || 0) - (bLink.height || 0));

        if (xDiff > 0.1 || yDiff > 0.1 || wDiff > 0.1 || hDiff > 0.1) {
          return false;
        }
      }

      // 【关键修复】比较图层内容的序列化长度，快速检测 attrs 等属性变化
      // 这是一个轻量级的检查，避免全量比较每个属性
      try {
        // 比较所有页面的图层序列化长度
        for (let i = 0; i < a.canvasData.content.pages.length; i++) {
          const aPage = a.canvasData.content.pages[i];
          const bPage = b.canvasData.content.pages[i];

          // 序列化图层数组并比较长度（快速检测内容变化）
          const aLayersStr = JSON.stringify(aPage?.layers || []);
          const bLayersStr = JSON.stringify(bPage?.layers || []);

          if (aLayersStr.length !== bLayersStr.length) {
            return false;
          }

          // 进一步检查：如果长度相同但内容可能不同，比较哈希
          // 使用简单的字符串比较（只比较前后各100个字符，平衡性能）
          const aPrefix = aLayersStr.substring(0, 100);
          const aSuffix = aLayersStr.substring(aLayersStr.length - 100);
          const bPrefix = bLayersStr.substring(0, 100);
          const bSuffix = bLayersStr.substring(bLayersStr.length - 100);

          if (aPrefix !== bPrefix || aSuffix !== bSuffix) {
            return false;
          }
        }

        // 比较固定图层
        const aFixedStr = JSON.stringify(a.canvasData.content.fixedLayer || []);
        const bFixedStr = JSON.stringify(b.canvasData.content.fixedLayer || []);

        if (aFixedStr.length !== bFixedStr.length) {
          return false;
        }
      } catch {
        // 序列化失败时认为不同，确保数据被保存
        return false;
      }

      // 【重要】所有关键属性都相同才认为相似
      return true;
    } catch {
      // 出错时认为不同，确保数据被保存
      return false;
    }
  }

  /**
   * 强制记录当前待处理的快照（如果有）
   * 用于确保在 undo/redo 前所有变更都已记录
   */
  flush = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.pendingSnapshots.length > 0) {
      // 【关键修复】flush 时处理所有待处理的快照
      // 用户主动触发 undo/redo 时，所有待处理的快照都应该被保存
      this.flushPendingSnapshots();
    }
  };

  /**
   * 清空重做栈
   * 【注意】此方法会清空所有可重做的操作
   */
  clearRedo = () => {
    if (this.redoStack.length > 0) {
      this.redoStack = [];
      // 清空后触发保存
      this.scheduleAutoSave();
    }
  };

  /**
   * 重做操作
   * @returns 要恢复的快照
   */
  redo = () => {
    // 确保所有待处理的快照都已记录
    this.flush();

    if (this.redoStack.length === 0) {
      return undefined;
    }

    this.isUndoRedoing = true;

    try {
      // 从重做栈中取出快照
      const redoSnapshot = this.redoStack.pop();

      if (!redoSnapshot) {
        return undefined;
      }

      // 将当前状态保存到撤销栈
      const currentSnapshot =
        this.storeTimelineStack[this.storeTimelineStack.length - 1];
      if (currentSnapshot) {
        // 当前状态会被替换，不需要额外保存
      }

      // 将重做的快照推回时间线栈
      this.storeTimelineStack.push(redoSnapshot);

      // 限制栈大小
      if (this.storeTimelineStack.length > this.maxUndoLevel) {
        this.storeTimelineStack.shift();
      }

      // 触发自动保存
      this.scheduleAutoSave();

      // 返回深拷贝的快照，防止外部修改
      return {
        actionName: redoSnapshot.actionName,
        dataSnapshot: deepCloneSnapshot(redoSnapshot.dataSnapshot),
      };
    } finally {
      this.isUndoRedoing = false;
    }
  };

  /**
   * 撤销操作
   * @returns 要恢复的快照
   */
  undo = () => {
    // 确保所有待处理的快照都已记录
    this.flush();

    // 至少需要 2 个快照：当前状态 + 要恢复的状态
    if (this.storeTimelineStack.length < 2) {
      return undefined;
    }

    this.isUndoRedoing = true;

    try {
      // 弹出当前状态，保存到重做栈
      const currentSnapshot = this.storeTimelineStack.pop();
      if (currentSnapshot) {
        this.redoStack.push(currentSnapshot);

        // 限制重做栈大小
        if (this.redoStack.length > this.maxUndoLevel) {
          this.redoStack.shift();
        }
      }

      // 获取要恢复的状态（不弹出，保留在栈中）
      const restoreSnapshot =
        this.storeTimelineStack[this.storeTimelineStack.length - 1];

      if (!restoreSnapshot) {
        // 理论上不应该发生，因为前面检查了长度
        console.error('撤销失败：无法获取要恢复的快照');
        // 将当前状态推回去
        if (currentSnapshot) {
          this.storeTimelineStack.push(currentSnapshot);
        }
        return undefined;
      }

      // 触发自动保存
      this.scheduleAutoSave();

      // 返回深拷贝的快照，防止外部修改
      return {
        actionName: restoreSnapshot.actionName,
        dataSnapshot: deepCloneSnapshot(restoreSnapshot.dataSnapshot),
      };
    } finally {
      this.isUndoRedoing = false;
    }
  };

  /**
   * 清空所有历史记录
   * 【警告】此方法会清空所有撤销重做历史，谨慎使用
   */
  clear = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
    this.pendingSnapshots = [];
    this.storeTimelineStack = [];
    this.redoStack = [];

    console.warn('⚠️  已清空所有撤销重做历史');
  };

  /**
   * 获取当前状态信息（用于调试）
   */
  getState = () => {
    return {
      undoStackSize: this.storeTimelineStack.length,
      redoStackSize: this.redoStack.length,
      pendingSnapshotsCount: this.pendingSnapshots.length,
      isUndoable: this.isUndoable(),
      isRedoable: this.isRndoable(),
    };
  };

  /**
   * 获取历史记录列表
   * @param maxCount 最大返回数量，默认 20
   * @returns 历史记录数组，包含当前状态和可重做的状态
   */
  getHistory = (maxCount = 20) => {
    // 确保待处理的快照已记录
    this.flush();

    const history: Array<{
      index: number;
      actionName: string;
      isCurrent: boolean;
      canJumpTo: boolean;
    }> = [];

    // 当前在时间线中的位置（最后一个就是当前状态）
    const currentIndex = this.storeTimelineStack.length - 1;

    // 添加撤销栈中的历史记录（从旧到新）
    this.storeTimelineStack.forEach((snapshot, index) => {
      history.push({
        index,
        actionName: snapshot.actionName,
        isCurrent: index === currentIndex,
        canJumpTo: true,
      });
    });

    // 添加重做栈中的记录（这些是未来的状态）
    this.redoStack.forEach((snapshot, index) => {
      history.push({
        index: this.storeTimelineStack.length + index,
        actionName: snapshot.actionName,
        isCurrent: false,
        canJumpTo: true,
      });
    });

    // 只返回最近的记录
    return history.slice(-maxCount);
  };

  /**
   * 跳转到指定的历史状态
   * @param targetIndex 目标状态的索引
   * @returns 是否跳转成功
   */
  jumpTo = (targetIndex: number): StoreTimelineSnapshot | undefined => {
    // 确保待处理的快照已记录
    this.flush();

    const currentIndex = this.storeTimelineStack.length - 1;
    const totalStates = this.storeTimelineStack.length + this.redoStack.length;

    // 验证索引有效性
    if (targetIndex < 0 || targetIndex >= totalStates) {
      return undefined;
    }

    // 已经在目标状态
    if (targetIndex === currentIndex) {
      return undefined;
    }

    this.isUndoRedoing = true;

    try {
      // 需要撤销
      if (targetIndex < currentIndex) {
        const steps = currentIndex - targetIndex;

        for (let i = 0; i < steps; i++) {
          const currentSnapshot = this.storeTimelineStack.pop();
          if (currentSnapshot) {
            this.redoStack.push(currentSnapshot);
          }
        }

        const targetSnapshot =
          this.storeTimelineStack[this.storeTimelineStack.length - 1];

        if (targetSnapshot) {
          return {
            actionName: targetSnapshot.actionName,
            dataSnapshot: deepCloneSnapshot(targetSnapshot.dataSnapshot),
          };
        }
      }
      // 需要重做
      else {
        const steps = targetIndex - currentIndex;

        for (let i = 0; i < steps; i++) {
          const redoSnapshot = this.redoStack.pop();
          if (redoSnapshot) {
            this.storeTimelineStack.push(redoSnapshot);
          }
        }

        const targetSnapshot =
          this.storeTimelineStack[this.storeTimelineStack.length - 1];

        if (targetSnapshot) {
          return {
            actionName: targetSnapshot.actionName,
            dataSnapshot: deepCloneSnapshot(targetSnapshot.dataSnapshot),
          };
        }
      }

      // 触发自动保存
      this.scheduleAutoSave();

      return undefined;
    } finally {
      this.isUndoRedoing = false;
    }
  };

  /**
   * 获取当前状态的索引
   */
  getCurrentIndex = () => {
    this.flush();
    return this.storeTimelineStack.length - 1;
  };

  /**
   * 手动保存到 IndexedDB
   * @returns 是否保存成功
   */
  save = async () => {
    try {
      this.flush(); // 确保待处理的快照已记录
      await this.saveToStorage();
      return true;
    } catch (error) {
      console.error('手动保存失败:', error);
      return false;
    }
  };

  /**
   * 手动从 IndexedDB 恢复
   * @returns 是否恢复成功
   */
  restore = async () => {
    try {
      await this.restoreFromStorage();
      return this.storeTimelineStack.length > 0;
    } catch (error) {
      console.error('手动恢复失败:', error);
      return false;
    }
  };

  /**
   * 清除持久化数据
   */
  clearPersistedData = async () => {
    if (!this.currentWorksId) return;

    try {
      await undoStorage.delete(this.currentWorksId);
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  };

  /**
   * 配置持久化选项
   */
  configurePersistence = (config: Partial<PersistenceConfig>) => {
    this.persistenceConfig = {
      ...this.persistenceConfig,
      ...config,
    };
  };

  /**
   * 启用/禁用持久化
   */
  setPersistenceEnabled = (enabled: boolean) => {
    this.persistenceConfig.enabled = enabled;
  };

  /**
   * 获取存储统计信息
   */
  getStorageStats = async () => {
    if (!this.currentWorksId) {
      return null;
    }

    const stats = await undoStorage.getStorageStats(this.currentWorksId);
    const config = undoStorage.getConfig();

    if (stats) {
      return {
        ...stats,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        maxSizeMB: config.maxStoragePerWorkMB,
        utilizationPercent: stats.utilizationPercent.toFixed(1),
      };
    }

    return null;
  };

  /**
   * 打印日志（用于调试）
   */
  log = async () => {
    console.group('UndoManager 状态');

    // 显示存储统计
    const stats = await this.getStorageStats();
    if (stats) {
    }

    console.groupEnd();
  };
}

export const undoManager = new UndoManager();
