interface CreateFormParams {
  /** 作品id */
  worksId: string;
  /** 用户id */
  uid: number;
  /** 表单内容 */
  content: any;
  /** 表单类型 */
  type: string;
}

interface FormProcessorOptions {
  /** 编辑器内的元素 */
  layerItem: any;
  worksId: string;
  uid: number;
  createForm: (params: CreateFormParams) => Promise<any>;
  getFormEntity: (formId: string) => Promise<any>;
}

interface FormProcessorRes {
  /** 转换后的 attrs */
  nextAttrs: Record<string, any>;
  /** 活动meta */
  activityMeta?: Record<string, any> | null;
}

export type FormProcessorFn = (
  options: FormProcessorOptions
) => Promise<FormProcessorRes>;
