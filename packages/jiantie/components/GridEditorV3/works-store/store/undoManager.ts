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

export class UndoManager {
  /** 最大可撤销数量 */
  maxUndoLevel = 100;

  /** store 的时间线 - 用于撤销操作 */
  storeTimelineStack: StoreTimelineSnapshot[] = [];

  /** 重做 stack - 用于重做操作 */
  redoStack: StoreTimelineSnapshot[] = [];

  /** 是否正在执行 undo/redo 操作 */
  private isUndoRedoing = false;

  /** 当前作品 ID（用于区分不同作品的历史） */
  private currentWorksId?: string;

  /** 自动保存计时器 */
  private autoSaveTimer?: ReturnType<typeof setTimeout>;

  /** 数据版本号 */
  private readonly version = '2.0.0';

  /** 自动保存延迟（毫秒） */
  private readonly autoSaveDelay = 2000; // 2 秒

  /** 最小保存间隔（毫秒） */
  private readonly minSaveInterval = 1000; // 1 秒
  private lastSaveTime = 0;

  constructor(maxUndoLevel = 100) {
    this.maxUndoLevel = maxUndoLevel;

    // 页面卸载前保存数据
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.save();
      });
    }
  }

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
   * 记录快照
   * @param timelineStore
   * @param externalIsUndoRedoing 外部 isUndoRedoing 标志（来自 WorksStore），用于同步检查
   */
  record = (
    timelineStore: StoreTimelineSnapshot,
    externalIsUndoRedoing?: boolean
  ) => {
    // 服务端渲染时不记录
    if (typeof window === 'undefined') {
      return;
    }

    // 正在执行 undo/redo 时不记录新快照（检查内部标志或外部标志）
    if (this.isUndoRedoing || externalIsUndoRedoing) {
      return;
    }

    // 立即深拷贝，避免引用被修改导致快照错误
    const clonedSnapshot = {
      actionName: timelineStore.actionName,
      dataSnapshot: deepCloneSnapshot(timelineStore.dataSnapshot),
    };

    // 检查是否与最后一个快照相同（避免重复记录）
    const lastSnapshot =
      this.storeTimelineStack[this.storeTimelineStack.length - 1];
    if (lastSnapshot) {
      // 简单比较：如果数据相同则跳过
      const isSame =
        JSON.stringify(lastSnapshot.dataSnapshot) ===
        JSON.stringify(clonedSnapshot.dataSnapshot);
      if (isSame) {
        return;
      }
    }

    // 添加新快照
    this.storeTimelineStack.push(clonedSnapshot);
    // 限制栈大小
    if (this.storeTimelineStack.length > this.maxUndoLevel) {
      this.storeTimelineStack.shift();
    }

    // 清空重做栈
    if (this.redoStack.length > 0) {
      this.redoStack = [];
    }

    // 触发自动保存
    this.scheduleAutoSave();
  };

  /**
   * 重做操作
   * @returns 要恢复的快照
   */
  redo = () => {
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
      const result = {
        actionName: redoSnapshot.actionName,
        dataSnapshot: deepCloneSnapshot(redoSnapshot.dataSnapshot),
      };
      return result;
    } finally {
      this.isUndoRedoing = false;
    }
  };

  /**
   * 撤销操作
   * @returns 要恢复的快照
   */
  undo = () => {
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
      const result = {
        actionName: restoreSnapshot.actionName,
        dataSnapshot: deepCloneSnapshot(restoreSnapshot.dataSnapshot),
      };
      return result;
    } finally {
      this.isUndoRedoing = false;
    }
  };

  /**
   * 跳转到指定的历史状态
   * @param targetIndex 目标状态的索引
   */
  jumpTo = (targetIndex: number): StoreTimelineSnapshot | undefined => {
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
   * 设置当前作品 ID
   * @param worksId 作品 ID
   */
  setWorksId = async (worksId: string) => {
    if (this.currentWorksId !== worksId) {
      // 切换作品时先保存当前作品的历史
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
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = undefined;
      }

      // 切换到新作品并恢复历史
      this.currentWorksId = worksId;
      await this.restoreFromStorage();
    }
  };

  /**
   * 从存储恢复状态
   */
  private restoreFromStorage = async () => {
    if (!this.currentWorksId) return;

    try {
      const data = await undoStorage.load(
        this.currentWorksId,
        this.version,
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
   * 触发自动保存（带节流）
   */
  private scheduleAutoSave = () => {
    if (!this.currentWorksId) return;

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
        setTimeout(() => {
          this.save();
          this.lastSaveTime = Date.now();
        }, this.minSaveInterval - timeSinceLastSave);
      } else {
        this.save();
        this.lastSaveTime = now;
      }
    }, this.autoSaveDelay);
  };

  /**
   * 手动保存到存储
   */
  save = async () => {
    if (!this.currentWorksId || this.storeTimelineStack.length === 0) {
      return;
    }

    try {
      await undoStorage.save(
        this.currentWorksId,
        this.storeTimelineStack,
        this.redoStack,
        this.storeTimelineStack.length - 1,
        this.version
      );
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  /**
   * 清空所有历史记录
   */
  clear = () => {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
    this.storeTimelineStack = [];
    this.redoStack = [];
  };

  /**
   * 获取历史记录列表
   * @param maxCount 最大返回数量，默认 20
   */
  getHistory = (maxCount = 20) => {
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
   * 获取当前状态的索引
   */
  getCurrentIndex = () => {
    return this.storeTimelineStack.length - 1;
  };
}
