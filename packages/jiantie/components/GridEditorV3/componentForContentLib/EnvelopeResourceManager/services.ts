import { EnvelopeConfig } from '../../../Envelope/types';
import { MaterialResourceManagerAPI } from '../MaterialResourceManager/services';

// 信封资源分类ID，如果不存在需要先在数据库中创建对应的 MaterialClassEntity
// 建议使用 alias: 'envelope' 创建
export const envelopeCateId = 'cmiwvew1w0000h3p4q4dg83rq';

// 信封资源管理器
export const envelopeManager = new MaterialResourceManagerAPI<EnvelopeConfig>(
  envelopeCateId
);
