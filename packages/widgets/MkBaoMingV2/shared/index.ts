/**
 * 定义组件数据结构
 */
export interface MkBaoMingV2Props {
  formRefId: string;
  collectFields: string[];
  show?: boolean;
  feedback?: string;
  customFields: Array<{
    id: string;
    label: string;
    options?: string;
    type: string;
    required?: boolean;
  }>;
}
