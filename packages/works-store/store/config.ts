import type { IWorksData } from '../types/interface';
import type { WorksDetailEntity } from './WorkSpec';

/**
 * 作品 API 接口定义
 * 用于依赖注入，允许自定义 API 实现（如 tRPC、REST API 等）
 */
export interface IWorksAPI {
  /** 更新作品详情 */
  updateWorksDetail?: (params: {
    id: string;
    data: Partial<WorksDetailEntity>;
  }) => Promise<Partial<WorksDetailEntity>>;

  /** 保存作品内容 */
  saveWorksContent?: (params: {
    id: string;
    content: IWorksData;
    isBackup: boolean;
  }) => Promise<{ version: number }>;

  /** 保存模板内容 */
  saveTemplateContent?: (params: {
    id: string;
    content: IWorksData;
    isBackup: boolean;
  }) => Promise<{ version: number }>;

  /** 获取作品数据 */
  getWorksData?: (params: { id: string; version?: string }) => Promise<{
    detail: Partial<WorksDetailEntity>;
    work_data: IWorksData | null;
  }>;

  /** 获取模板数据 */
  getTemplateData?: (params: { id: string }) => Promise<{
    detail: Partial<WorksDetailEntity>;
    work_data: IWorksData | null;
  }>;
}

export class IWorksStoreConfig<T extends Object = any> {
  /** 作品服务地址，最后不需要/ */
  worksServer!: () => string;
  widgetServer!: () => string;
  /** 组件资源地址，最后不需要/ */
  widgetResourceCdn!: () => string;
  worksId!: () => string;
  userId!: () => string;
  requestInterceptors!: (config: any) => any;
  onGetWorksError?: (error: any) => void;
  isTemplate?: boolean;
  /** 自动保存频率，-1关闭自动保存，单位是秒 */
  autoSaveFreq!: number;
  noSave?: boolean;
  /**
   * 作品服务版本
   * v1: 作品服务v1版本
   * v2: 作品服务v2版本
   */
  apiVersion!: 'v1' | 'v2';
  version?: () => string;

  /**
   * 自定义 API 实现（可选）
   * 如果提供，将优先使用这些方法，否则使用内置的 axios 实现
   */
  api?: IWorksAPI;

  maxPage?: number;

  isFlatPages?: boolean;
}
