import { SerializedWorksEntity } from '../../../../utils';
import { IWorksData } from '../types';

export class IWorksStoreConfig {
  /** 是否只读 */
  readonly!: boolean;
  /** 作品 ID，如果有 worksData 和 worksDetail，则不会通过api获取作品数据和作品详情 */
  worksId!: () => string;
  /** 自动保存频率，-1关闭自动保存，单位是秒 */
  autoSaveFreq!: number;
  /** 是否禁用保存 */
  noSave?: boolean;
  /** 是否为模板 */
  isTemplate?: boolean;
  /** 版本号（可选） */
  version?: () => string;
  // 如果有，则不会通过api获取作品数据
  worksData?: IWorksData;
  // 如果有，则不会通过api获取作品详情
  worksDetail?: SerializedWorksEntity;
}
