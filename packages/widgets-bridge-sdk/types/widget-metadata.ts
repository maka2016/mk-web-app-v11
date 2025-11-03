export interface WidgetResItem {
  id: number | string;
  ref: string;
  label: string;
  cdnPath: string;
  componentMeta: WidgetMeta;
}

/**
 * 组件的元数据信息
 */
export interface WidgetMeta {
  /** meta 数据协议版本 */
  _version: number;
  /** 组件的版本 */
  version: string;
  /** 组件的 ref，用于辨别查找组件实例，最重要的字段 */
  elementRef: string;
  /** 组件的显示名 */
  label: string;
  /** 组件的介绍 */
  desc: string;
  /** logo 地址 */
  logo: string;
  /** 活动组件 */
  activity?: {
    /** 是否启动活动 */
    enable: boolean;
    /** 组件的推广类型 */
    promoType: string;
  };
  /** 组件的事件，保留字段 */
  eventAttr?: [];
  /** viewer 能力依赖 */
  viewerApply: {
    /** 是否需要微信授权能力 */
    wxAuth?: boolean;
    /** 是否可交互 */
    interaction?: boolean;
    /** 是否可滚动 */
    scrollable?: boolean;
    /** 请求库 */
    request?: any;
  };
  /** 编辑器能力依赖 */
  editorApply: {
    /** web 表单的引用，重要字段 */
    webFormRef: string;
    /** wap 表单的引用，重要字段 */
    wapFormRef: string;
    /** 是否在禁止自由元素编辑模式下的例外 */
    disableFreeEditException?: boolean;
    /** 是否禁用组件的高粱状态 */
    disableCompHighlight?: boolean;
    /** 是否隐藏wap 表单 */
    hideWapForm?: boolean;
    /** 选择模版的引用 */
    templatesRef?: string;
    /** 双击编辑 */
    doubleTapToEdit?: boolean;
    /** 是否使用系统表单 */
    useSystemForm?: boolean;
    /** 是否使用自定义表单 */
    useCustomForm?: boolean;
    /** 是否使用动作配置表单 */
    useActionForm?: boolean;
    /** 独占一页的设置 */
    blockInPageOptions?: {
      height?: number;
      forWorksType?: string[];
      disabledCommonOperator?: boolean;
      disableCompHighlight?: boolean;
    };
    /** web 编辑态组件的引用 */
    webEditingCompRef?: string;
    /** wap 编辑态组件的引用 */
    wapEditingCompRef?: string;
    /** 组件管理工具，用于开发阶段 */
    managerRef?: string;
    /** 编辑器画布控制，禁止编辑器缩放的方向, ['diagonal', 'horizontal', 'vertical'] */
    disableScaleDirection?: string[];
    /** 翻页H5编辑器画布控制，禁止编辑器缩放的方向, ['diagonal', 'horizontal', 'vertical'] */
    fanyeH5DisableScaleDirection?: string[];
    /** 图层表单配置，用于编辑器通用表单的扩展 */
    layer?: Record<string, boolean>;
    /** 是否可在画布交互，如果 false，则画布不会响应任何事件 */
    canvasInteraction?: boolean;
    /** 选中时是否在画布上显示组件标识 */
    showCompMark?: boolean;
    /** 选中时是否高亮操作框 */
    highlightOperator?: boolean;
    /** 选中时高亮提示 */
    highlightOperatorText?: string;
    /** 是否禁用复制 */
    disabledCopy?: boolean;
    /** 是否禁止删除 */
    disabledDelete?: boolean;
    /** 是否禁止移动 */
    disabledMove?: boolean;
    /** 是否禁止缩放 */
    disableScale?: boolean;
    /** 禁用通用的操作框 */
    disabledCommonOperator?: boolean;
    /** 使用去除水印的表单 */
    useRemoveWatermarkForm?: boolean;
  };
  /** 是否禁用，默认 false */
  disabled?: boolean;
  /** 是否显示，默认 true */
  visable?: boolean;
  /** 是否内部组件（运营或内部设计师专用，默认 false） */
  internalWidget?: boolean;
  /** 排序，数值越大越靠前 */
  order?: number;
}

/**
 * 编辑表单的元数据信息
 */
export interface CustomFormMeta {
  /** 版本 */
  version: string;
  /** 表单的引用，对应 customFormRef */
  formRef: string;
}

/**
 * 编辑表单的元数据信息
 */
export interface CustomWapFormMeta {
  /** 版本 */
  version: string;
  /** 表单的引用，对应 customFormRef */
  formRef: string;
}

/**
 * 编辑表单的元数据信息
 */
export interface EditingFormFormMeta {
  /** 版本 */
  version: string;
  /** 表单的引用，对应 customFormRef */
  formRef: string;
}

export type WidgetTemplateDataType = () => Promise<Record<string, any>>;

export interface WidgetTemplateItem {
  /** 模版数据 */
  data: Record<string, any> | WidgetTemplateDataType;
  /** 展示的 label */
  label: string;
  /** 展示的 icon */
  icon?: string;
  /** 预览图 */
  img?: string;
}

export type WidgetTemplateData = WidgetTemplateItem[];
