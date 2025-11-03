/**
 * 定义组件数据结构
 */
export interface MkPinTuanProps {
  formRefId: string;
  collectFields: string[];
  isTemplate?: boolean;
  show?: boolean;
  courseOptions?: string;
  feedback?: string;
  type: 'baoming' | 'boost' | 'groupbuy';
  boostActivityId?: number;
  groupBuyActivityId?: number;
}
