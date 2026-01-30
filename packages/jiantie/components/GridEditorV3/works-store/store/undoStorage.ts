/**
 * 撤销重做数据持久化存储
 * 使用 IndexedDB 替代 localStorage，支持更大的存储容量
 */

import { StoreTimelineSnapshot } from './undoManager';

interface PersistedData {
  version: string;
  timestamp: number;
  worksId: string;
  storeTimelineStack: StoreTimelineSnapshot[];
  redoStack: StoreTimelineSnapshot[];
  currentIndex: number;
}

/**
 * IndexedDB 存储实现
 */
class IndexedDBStorage {
  private dbName = 'UndoManagerDB';
  private storeName = 'undoHistory';
  private version = 1;
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return false;
    }

    return new Promise(resolve => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'worksId',
          });

          // 创建索引
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * 保存数据
   */
  async save(worksId: string, data: PersistedData): Promise<boolean> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) return false;
    }

    return new Promise(resolve => {
      if (!this.db) {
        resolve(false);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(data);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error('保存到 IndexedDB 失败:', request.error);
        resolve(false);
      };
    });
  }

  /**
   * 读取数据
   */
  async load(worksId: string): Promise<PersistedData | null> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) return null;
    }

    return new Promise(resolve => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(worksId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('从 IndexedDB 读取失败:', request.error);
        resolve(null);
      };
    });
  }

  /**
   * 删除数据
   */
  async delete(worksId: string): Promise<boolean> {
    if (!this.db) return false;

    return new Promise(resolve => {
      if (!this.db) {
        resolve(false);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(worksId);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error('从 IndexedDB 删除失败:', request.error);
        resolve(false);
      };
    });
  }

  /**
   * 清理过期数据
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.db) return 0;

    return new Promise(resolve => {
      if (!this.db) {
        resolve(0);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('timestamp');
      const request = index.openCursor();

      const cutoffTime = Date.now() - maxAge;
      let deletedCount = 0;

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const data = cursor.value as PersistedData;

          if (data.timestamp < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }

          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('清理过期数据失败:', request.error);
        resolve(0);
      };
    });
  }

  /**
   * 获取所有作品 ID
   */
  async getAllWorksIds(): Promise<string[]> {
    if (!this.db) return [];

    return new Promise(resolve => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        console.error('获取所有 worksId 失败:', request.error);
        resolve([]);
      };
    });
  }
}

/**
 * 统一的存储接口
 */
export class UndoStorage {
  private indexedDB = new IndexedDBStorage();
  private initialized = false;
  private migrated = false;

  // 当前数据版本号（与 UndoManager 中的版本保持一致）
  private readonly CURRENT_VERSION = '2.0.0';

  // 每个作品的最大存储空间（字节）
  private readonly maxStoragePerWork = 50 * 1024 * 1024; // 50 MB

  // 保留的最小快照数量
  private readonly minSnapshotsToKeep = 5;

  /**
   * 比较两个版本号（semver 格式：x.y.z）
   * @param version1 版本1
   * @param version2 版本2
   * @returns 如果 version1 < version2 返回 -1，相等返回 0，version1 > version2 返回 1
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.initialized = await this.indexedDB.init();

    // 初始化成功后，尝试迁移 localStorage 数据
    if (!this.migrated) {
      await this.migrateFromLocalStorage();
      this.migrated = true;
    }

    // 清除所有低于当前版本的旧数据
    await this.cleanupOldVersions();
  }

  /**
   * 从 localStorage 迁移数据到 IndexedDB
   */
  private async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKeyPrefix = 'undoManager';
      const migratedKeys: string[] = [];

      // 遍历所有 localStorage 键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(storageKeyPrefix)) continue;

        // 跳过元数据键
        if (key.endsWith('_metadata')) continue;

        try {
          const data = localStorage.getItem(key);
          if (!data) continue;

          const parsed = JSON.parse(data);

          // 检查是否是有效的持久化数据
          if (
            parsed.version &&
            parsed.worksId &&
            parsed.storeTimelineStack &&
            parsed.timestamp
          ) {
            // 检查 IndexedDB 中是否已有数据
            const existing = await this.indexedDB.load(parsed.worksId);

            if (!existing) {
              // IndexedDB 中没有数据，迁移过去
              const success = await this.indexedDB.save(parsed.worksId, {
                version: parsed.version,
                timestamp: parsed.timestamp,
                worksId: parsed.worksId,
                storeTimelineStack: parsed.storeTimelineStack || [],
                redoStack: parsed.redoStack || [],
                currentIndex: parsed.currentIndex || 0,
              });

              if (success) {
                migratedKeys.push(key);
              }
            } else {
              // IndexedDB 中已有数据，比较时间戳
              if (parsed.timestamp > existing.timestamp) {
                // localStorage 数据更新，覆盖 IndexedDB
                await this.indexedDB.save(parsed.worksId, {
                  version: parsed.version,
                  timestamp: parsed.timestamp,
                  worksId: parsed.worksId,
                  storeTimelineStack: parsed.storeTimelineStack || [],
                  redoStack: parsed.redoStack || [],
                  currentIndex: parsed.currentIndex || 0,
                });
                migratedKeys.push(key);
              } else {
                // IndexedDB 数据更新，删除 localStorage
                migratedKeys.push(key);
              }
            }
          }
        } catch (error) {
          // 忽略单个键的迁移失败
        }
      }

      // 删除已迁移的 localStorage 数据
      if (migratedKeys.length > 0) {
        migratedKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            // 忽略删除失败
          }
        });
      }

      // 清理元数据
      try {
        localStorage.removeItem(`${storageKeyPrefix}_metadata`);
      } catch (error) {
        // 忽略错误
      }
    } catch (error) {
      console.error('从 localStorage 迁移数据失败:', error);
    }
  }

  /**
   * 计算数据大小（字节）
   */
  private calculateDataSize(data: PersistedData): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      console.error('计算数据大小失败:', error);
      return 0;
    }
  }

  /**
   * 智能裁剪快照以满足存储限制
   */
  private trimSnapshotsToFit(
    data: PersistedData,
    maxSize: number
  ): PersistedData {
    let trimmedData = { ...data };
    let currentSize = this.calculateDataSize(trimmedData);

    // 如果大小在限制内，直接返回
    if (currentSize <= maxSize) {
      return trimmedData;
    }

    // 策略 1: 优先删除旧的撤销快照
    while (
      currentSize > maxSize &&
      trimmedData.storeTimelineStack.length > this.minSnapshotsToKeep
    ) {
      trimmedData.storeTimelineStack.shift(); // 删除最旧的
      trimmedData.currentIndex = Math.max(0, trimmedData.currentIndex - 1);
      currentSize = this.calculateDataSize(trimmedData);
    }

    // 策略 2: 如果还是太大，删除重做快照
    while (currentSize > maxSize && trimmedData.redoStack.length > 0) {
      trimmedData.redoStack.shift(); // 删除最旧的
      currentSize = this.calculateDataSize(trimmedData);
    }

    // 策略 3: 如果还是太大，继续删除撤销快照（保留最少 1 个）
    while (currentSize > maxSize && trimmedData.storeTimelineStack.length > 1) {
      trimmedData.storeTimelineStack.shift();
      trimmedData.currentIndex = Math.max(0, trimmedData.currentIndex - 1);
      currentSize = this.calculateDataSize(trimmedData);
    }

    const finalSize = this.calculateDataSize(trimmedData);
    const finalSnapshotCount = trimmedData.storeTimelineStack.length;
    const deletedCount =
      data.storeTimelineStack.length - trimmedData.storeTimelineStack.length;

    if (deletedCount > 0) {
      console.warn(
        `存储空间限制：已自动裁剪 ${deletedCount} 个旧快照 (${(finalSize / 1024 / 1024).toFixed(1)} MB / ${(maxSize / 1024 / 1024).toFixed(0)} MB)`
      );
    }

    return trimmedData;
  }

  /**
   * 保存数据
   */
  async save(
    worksId: string,
    storeTimelineStack: StoreTimelineSnapshot[],
    redoStack: StoreTimelineSnapshot[],
    currentIndex: number,
    version?: string
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return false;
    }

    let data: PersistedData = {
      version: version || this.CURRENT_VERSION,
      timestamp: Date.now(),
      worksId,
      storeTimelineStack,
      redoStack,
      currentIndex,
    };

    // 检查数据大小并裁剪
    const dataSize = this.calculateDataSize(data);

    if (dataSize > this.maxStoragePerWork) {
      data = this.trimSnapshotsToFit(data, this.maxStoragePerWork);

      const finalSize = this.calculateDataSize(data);
      if (finalSize > this.maxStoragePerWork) {
        console.error(
          `存储失败：数据过大 (${(finalSize / 1024 / 1024).toFixed(1)} MB)，已达到限制`
        );
        return false;
      }
    }

    return await this.indexedDB.save(worksId, data);
  }

  /**
   * 加载数据
   */
  async load(
    worksId: string,
    expectedVersion?: string,
    maxAge: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<{
    storeTimelineStack: StoreTimelineSnapshot[];
    redoStack: StoreTimelineSnapshot[];
  } | null> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return null;
    }

    const data = await this.indexedDB.load(worksId);

    if (!data) {
      return null;
    }

    // 版本检查
    const targetVersion = expectedVersion || this.CURRENT_VERSION;
    if (data.version !== targetVersion) {
      return null;
    }

    // 时间检查
    const age = Date.now() - data.timestamp;
    if (age > maxAge) {
      return null;
    }

    return {
      storeTimelineStack: data.storeTimelineStack,
      redoStack: data.redoStack,
    };
  }

  /**
   * 删除数据
   */
  async delete(worksId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return false;
    }

    return await this.indexedDB.delete(worksId);
  }

  /**
   * 清理过期数据
   */
  async cleanup(maxAge?: number): Promise<number> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return 0;
    }

    return await this.indexedDB.cleanup(maxAge);
  }

  /**
   * 清除所有低于当前版本的旧数据
   * 自动检测并清除所有版本号低于 CURRENT_VERSION 的数据
   */
  async cleanupOldVersions(): Promise<number> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return 0;
    }

    try {
      const allWorksIds = await this.indexedDB.getAllWorksIds();
      let deletedCount = 0;
      const deletedVersions = new Set<string>();

      for (const worksId of allWorksIds) {
        const data = await this.indexedDB.load(worksId);
        if (data && data.version) {
          // 如果数据版本低于当前版本，则清除
          if (this.compareVersions(data.version, this.CURRENT_VERSION) < 0) {
            const success = await this.indexedDB.delete(worksId);
            if (success) {
              deletedCount++;
              deletedVersions.add(data.version);
            }
          }
        }
      }

      if (deletedCount > 0) {
        const versionsList = Array.from(deletedVersions).join(', ');
        console.log(
          `已清除 ${deletedCount} 个作品的旧版本数据 (版本: ${versionsList}，当前版本: ${this.CURRENT_VERSION})`
        );
      }

      return deletedCount;
    } catch (error) {
      console.error('清除旧版本数据失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有作品 ID
   */
  async getAllWorksIds(): Promise<string[]> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return [];
    }

    return await this.indexedDB.getAllWorksIds();
  }

  /**
   * 检查是否可用
   */
  isAvailable(): boolean {
    return this.initialized;
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(worksId: string): Promise<{
    totalSize: number;
    snapshotCount: number;
    utilizationPercent: number;
    canAddMore: boolean;
  } | null> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) {
      return null;
    }

    try {
      const data = await this.indexedDB.load(worksId);

      if (!data) {
        return {
          totalSize: 0,
          snapshotCount: 0,
          utilizationPercent: 0,
          canAddMore: true,
        };
      }

      const totalSize = this.calculateDataSize(data);
      const snapshotCount = data.storeTimelineStack.length;
      const utilizationPercent = (totalSize / this.maxStoragePerWork) * 100;
      const canAddMore = totalSize < this.maxStoragePerWork * 0.9; // 90% 以下可以继续添加

      return {
        totalSize,
        snapshotCount,
        utilizationPercent,
        canAddMore,
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return null;
    }
  }

  /**
   * 获取配置信息
   */
  getConfig() {
    return {
      maxStoragePerWork: this.maxStoragePerWork,
      maxStoragePerWorkMB: this.maxStoragePerWork / 1024 / 1024,
      minSnapshotsToKeep: this.minSnapshotsToKeep,
    };
  }
}

// 导出单例
export const undoStorage = new UndoStorage();
