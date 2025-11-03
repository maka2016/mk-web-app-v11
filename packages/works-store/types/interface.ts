import {
  TurnPageAnimationMapping,
  TurnPageIndicatorMapping,
  TurnPageNumberMapping,
} from '../const/viewer-turn-page-interface/const';
import { WorksStore } from '../store';
import { AnimateQueue } from './animate';
import { AnimateQueue2 } from './animate2';
import { AnimationMeta } from './animation';
import { ThemeConfig, ThemeSchema } from './theme';

/**
 * 作品数据
 */
export class IWorksData {
  /** 操作版本，每次一个操作 +1 */
  _version!: number;

  /** 页面的画布的数据结构 */
  canvasData!: {
    /** 画布宽度 */
    width: number;
    /** 画布高度 */
    height: number;
    /**
     * 作品实际高度
     * 如果是多页平铺模式，则等于每个画布加起来，visualHeight = Sum(page.height)
     */
    visualHeight: number;
    /** 布局内容 */
    content: {
      /** 画布的多页结构 */
      pages: Pages;

      /** 固定页面 */
      fixedPages: FixedPage;

      /** 固定元素 */
      fixedLayer: LayerElemItem[];
    };
    /** 动作配合，可以先忽略 */
    actions: ActionsMap;
    /** 音乐库 */
    music: IMusic;
  };

  /**
   * @deprecated
   * 废弃属性，请使用 positionLink
   */
  linkDict?: PositionLinkMap;

  /** 元素在画布中的容器的定位信息 */
  positionLink!: PositionLinkMap;

  /**
   * @deprecated
   * 废弃属性
   */
  modules?: Array<IModule>;

  /** 作品元数据 */
  meta?: IWorksMeta;

  pageSetting!: PageSetting;

  /**
   * 编辑器模式，absolute 是绝对布局，flex 是流式布局编辑器，默认 absolute
   */
  editorMode?: EditorMode;

  /** 作品样式表 */
  style?: {
    /** 图层样式 */
    layer?: React.CSSProperties;
    /** 作品样式 */
    works?: React.CSSProperties;
    /** 通用主题结构，内容是MAKA元素的attrs的值 */
    themeSchema?: ThemeSchema;
    _version?: number;
    themeConfig?: ThemeConfig;
  };

  /**
   * 模板商城展示信息
   * 注意：只有模板才有此字段，用户创作的作品不需要
   */
  templateShowcaseInfo?: TemplateShowcaseInfo;
}

/**
 * 动画数据结构
 */
export interface MKAnimation extends AnimationMeta {}

export enum GroupType {
  保持 = 'keep',
  临时 = 'temporary',
}

/**
 * 作品音乐
 */
export class IMusic {
  title?: string;

  url?: string;

  preview?: string;

  materialId?: string;

  type?: string;

  duration?: number | 0;
  disabled?: boolean;
}

/**
 * 阴影配置
 */
export interface IAttrShadow {
  blur: number;
  color: string;
  enable: boolean;
  direction: number;
}

/** 备注素材的上传文件 */
export interface IFile {
  /** 文件名 */
  fileName: string;
  /** 文件地址 */
  url: string;
  /** 文件类型 */
  fileType: string;
  size?: number;
}

/**
 * 备注素材
 */
export interface ICommentMaterial {
  /** 图层名字 */
  name: string;
  /** 预览图 */
  previewUrl: string;
  /** icon，针对非图片元素 */
  iconName?: string;
  /** 备注的文字内容 */
  description: string;
  /** 上传的图片列表 */
  uploadImgs?: IFile[];
  /** 上传的文件列表 */
  uploadFiles?: IFile[];
  /** 组件id */
  comId: string;
  /** 组件类型 */
  elementRef: string;
  /** 添加备注的时间，时间戳 */
  createTime: number;
}

/** maka素材 */
export interface IMakaMaterial {
  /** 图层名字 */
  name: string;
  /** 预览图 */
  previewUrl?: string;
  /** icon，针对非图片元素 */
  iconName?: string;
  /** 素材id */
  materialId?: string;
  /** 组件id */
  comId: string;
  /** 组件类型 */
  elementRef: string;
}

/** 统一格式后的引用素材数据结构，用于在素材列表展示 */
export interface IformatRefMaterial extends IMakaMaterial {
  refUrl?: string;
  refProperty?: IRefMaterial;
  layerProperty?: ContentAttrs;
}

/** 引用素材 */
// export interface IRefMaterial extends IMakaMaterial{
//     /** 系统的素材图片 */
//     refUrl?: string
// }

/**
 * 元素在画布中的数据定义
 */
export class IPositionLink {
  x!: number;

  y!: number;

  /** 景深 */
  z?: number;

  zIndex?: number;

  lock?: boolean;

  /** 是否被禁用，用于内部组件 */
  disabled?: boolean;

  width?: number;

  rotate?: number;

  height?: number;

  // shadow?: IAttrShadow
  opacity?: number;

  visibility?: boolean;

  /** 组件是否已 didMount，依据是是否调用了 didMount */
  mount?: boolean;

  /** 在组合里面时 这个值存在 */
  parentId?: string;

  /** 成组类型 当并且仅当 parentId 存在时有意义 */
  groupType?: GroupType;

  /** 图层名字 */
  name?: string;

  animation?: AnimationMeta[];

  /** 动画队列 */
  animateQueue?: AnimateQueue;

  animateQueue2?: AnimateQueue2;

  moduleId?: string;

  action?: {
    enable: boolean;
    type: string;
    label?: string;
    actionAttrs: Record<string, any>;
  };

  constraints?: 'LT' | 'RT' | 'LB' | 'RB';

  disabledCommonOperator?: boolean;

  // 元素标签
  tag?: string;

  maskImage?: string;
}

export type PositionLinkMap = Record<string, IPositionLink>;

/**
 * 引用素材信息
 */
export interface IRefMaterial {
  contentId: string;
  elemId?: string;
  name: string;
  preview: string;
  property: any;
  thumbnail: string;
}

/**
 * 布局元素
 */
export class LayerElemItem {
  /** 元素类型  */
  type!: 'container' | 'element';

  /** 传入到组件的属性  */
  attrs!: ContentAttrs;

  /** 子元素  */
  body?: LayerElemItem[];

  /** element id */
  elemId!: string;

  /** 组件的引用 */
  elementRef!: string;

  /** 父级组件的id 默认是画布 */
  parentId?: string;

  /** 备注素材 */
  comment?: ICommentMaterial;

  /** 来自哪里，maka => 内容中心 */
  from?: string;

  refMaterial?: IRefMaterial;
}

/**
 * 动作的配置项
 */
export type ActionsMap = {
  /** action ID */
  [actionId: string]: {
    /** action type */
    actionType: string;
    /** 动作的名字 */
    label: string;
    /** 配置给 action 的配置数据，相当于 props */
    actionAttrs?: any;
  };
};

/**
 * 由右边编辑面板产出的数据
 */
export type ContentAttrs = {
  [key: string]: any;
};

export interface Colors {
  degress: number; // 渐变角度 0-360
  points: Point[]; // 渐变色相关颜色值数据
}

interface Point {
  position: number; // 渐变颜色位置 0-100
  rgb: Rgb; // rgba
}

export interface Rgb {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 颜色不透明度 0-1
}

/**
 * 背景数据
 */
export class WorksBackground {
  materialId?: string;

  bgcolor?: string;

  colors?: Colors;

  colorRgb?: Rgb;

  bgpic?: string;

  bgpicheight?: number;

  bgpicscalerate?: number;

  originheight?: number;

  bgpicleft?: number;

  bgpictop?: number;

  bgpictype?: string;

  bgpicwidth?: number;

  originwidth?: number;

  opacity?: number;

  flipHorizontal?: boolean;

  flipVertical?: boolean;

  canvasheight?: number;

  canvaswidth?: number;

  /** 氛围设置 */
  atmosphere?: {
    url: string;
    materialId: string;
    name: string;
  };

  /** 切片模式的背景 */
  clipBgSetting?: {
    /** 顶部背景 */
    head?: {
      type: 'color' | 'image';
      ossPath?: string;
      color?: string;
    };

    /** 中部背景，repeat y */
    body?: {
      type: 'color' | 'image';
      ossPath?: string;
      color?: string;
    };

    /** 底部背景 */
    foot?: {
      type: 'color' | 'image';
      ossPath?: string;
      color?: string;
    };
  };
}

/**
 * 页面配置数据
 */
export class WorksPage {
  id!: string;

  /** 图层 */
  layers!: LayerElemItem[];

  /** 透明度 */
  opacity!: number;

  /** 背景数据 */
  background!: WorksBackground;

  width!: number;

  height!: number;

  /** 前景，不可交互 */
  frontground?: {
    url: string;
  };

  templateId?: string;

  options?: {
    /**
     * 开启用户自由调节模块高度
     * @example
     * @type {Boolean}
     */
    enableUserTransformHeight?: boolean;
    enableCopy?: boolean;
    enableDelete?: boolean;
    /**
     * 允许接收的元素(elementRef)
     * 任意元素则不传
     * @example ['Mksvg']
     * @type {Array<string>}
     */
    allowsReceive?: Array<string>;
    /**
     * 是否开启模块悬浮高亮
     *
     * @type {boolean}
     */
    enableModuleHl?: boolean;
    /**
     * 是否开启更多操作
     *
     * @type {boolean}
     */
    enableOperator?: boolean;
    /** 禁止页面的更多选项 */
    disabledPageOptions?: boolean;
  };

  /** 规格关联 */
  specConnection?: {
    type: ModuleConnectionType;
    id: string;
    name: string;
  };

  /** 景深动画 */
  dethOfFieldAnimation?: {
    translateZ?: number;
    perspective?: number;
    duration?: number;
    delay?: number;
  };

  animationTemplate?: {
    name?: string;
    direction?: string;
    enterAnimationRef?: string;
  };
}

export class FixedPage {
  layers!: LayerElemItem[];
}
/**
 * 页面
 */
export type Pages = WorksPage[];
// export interface Pages =  WorksPage[]

/**
 * 作品类型
 */
export type WorksType = 'h5' | 'poster' | 'video' | 'mori' | 'longH5';

export type EditorMode = 'absulote' | 'flex';

export class PageSetting {
  /** 翻页动画设置 */
  paginAnimateSetting?: {
    indicator: keyof typeof TurnPageIndicatorMapping;
    pageNumber: keyof typeof TurnPageNumberMapping;
    pageTurningEffect: keyof typeof TurnPageAnimationMapping;
    autoPlay: boolean;
    autoPlayTime: number;
    disableManualPageTurning: boolean;
    disableManualPageTurningList?: number[];
  };

  password?: string;

  customerService?: {
    visible: boolean;
    picture: string;
    remark: string;
  };

  customBrandIdentity?: {
    enable: boolean;
    logo: string;
    footnote: string;
  };
}

export type ModuleConnectionType = 'spec' | 'activity';

export class IModule {
  id!: string;

  height!: number;

  bgData!: WorksBackground;

  options?: {
    /**
     * 开启用户自由调节模块高度
     * @example
     * @type {Boolean}
     */
    enableUserTransformHeight?: boolean;
    enableCopy?: boolean;
    enableDelete?: boolean;
    /**
     * 允许接收的元素(elementRef)
     * 任意元素则不传
     * @example ['Mksvg']
     * @type {Array<string>}
     */
    allowsReceive?: Array<string>;
  };

  /** 规格关联 */
  specConnection?: {
    type: ModuleConnectionType;
    id: string;
    name: string;
  };
}

export class IWorksMeta {
  /** 画布原始尺寸 */
  originCanvasScale?: {
    width: number;
    height: number;
  };

  needWxAuth?: boolean;

  /** 活动元数据 */
  activity?: {
    /** 推广类型，根据业务定义，无法在此预判类型 */
    promoType: string;
    /** 活动类型 */
    type: string;
    /** 活动类名称 */
    name: string;
    /** 活动标题 */
    title: string;
    /** 持续时间 */
    duration?: string;
  };
}

export type AddComponentParams = Partial<LayerElemItem>;

export class CopyData {
  entity!: LayerElemItem;
}

export class PasteDataItem {
  entity!: LayerElemItem;

  inputLinkDict!: IPositionLink;

  originLink!: IPositionLink;

  compId!: string;
}

export type PasteData = PasteDataItem | Array<PasteDataItem>;

export interface CopyEntityData {
  entities: CopyItem[];
  positionLink: PositionLinkMap;
}

export interface CopyItem {
  entity: LayerElemItem;
  compId: string;
  originLink: IPositionLink;
}

export class PasteDict {
  moveInfo?: { dx: number; dy: number };

  positionLink?: PositionLinkMap;
}

export type ActionInterceptor = (
  param: { action: Function; worksData: WorksStore },
  ...args: any
) => any;

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

export class DataFromContentLib {
  layers!: LayerElemItem;

  /**
   * 其他不修改直接添加的数据
   */
  rawLayers?: LayerElemItem[];

  /**
   * works data version > 14 以后的都是此结构
   */
  positionLink!: PositionLinkMap;

  /**
   * @deprecated
   * 旧数据结构，但是已生产的素材大量是这种结构
   */
  linkDict?: PositionLinkMap;

  body!: LayerElemItem[];
}

export type IObject<T = any> = Record<string, T>;

/**
 * 预览图配置
 */
export interface TemplateShowcasePreviewImage {
  /** 图片唯一标识 */
  id: string;
  /** 图片完整 URL（OSS） */
  url: string;
  /** 缩略图 URL（用于列表，400x400） */
  thumbnailUrl: string;
  /** 显示顺序（0-8，最多9张） */
  order: number;
  /** 是否为封面图（只能有一张） */
  isCover: boolean;
  /** 原图宽度 */
  width?: number;
  /** 原图高度 */
  height?: number;
  /** 上传时间戳 */
  uploadedAt: number;
}

/**
 * 富文本内容
 */
export interface TemplateShowcaseRichText {
  /** 内容格式 */
  format: 'html' | 'markdown';
  /** 格式化内容 */
  content: string;
  /** 纯文本版本（用于搜索和预览） */
  plainText: string;
}

/**
 * 模板商城展示信息（核心数据结构）
 */
export interface TemplateShowcaseInfo {
  /** 展示标题（1-100字符，必填） */
  displayTitle: string;
  /** 展示描述（富文本，最多5000字符） */
  displayDescription: TemplateShowcaseRichText;
  /** 预览图列表（1-9张，至少1张） */
  previewImages: TemplateShowcasePreviewImage[];
  /** 是否启用商城展示 */
  enabled: boolean;
  /** 配置创建时间 */
  createdAt: number;
  /** 配置更新时间 */
  updatedAt: number;
}

export interface ActiveItem {
  name: string;
  contentProps: {
    [key: string]: any;
  };
  comId: string;
  /** 废弃 */
  idx: number;
  path?: string[];
}

export interface IDomRect {
  x: number;
  y: number;
  top: number;
  left: number;
  width: number;
  right: number;
  height: number;
  bottom: number;
  toJSON?: any;
  center: {
    x: number;
    y: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export type SetLinkBatchParams = {
  elemId: string;
  nextContainerInfo: Partial<IPositionLink>;
}[];
export type ChangeCompAttrMultiParams = {
  elemId: string;
  nextAttrs: any;
}[];

export interface CompDidMountEmitData<T = Record<string, any>> {
  /** 自身的盒子信息 */
  boxInfo: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  /** 其他信息 */
  data?: T;
}
export type OperatorHandle =
  | 'verticalOnly'
  | 'horizontalOnly'
  | 'disableScale'
  | 'diagonalOnly'
  | 'disableDiagonal'
  | 'full'
  | 'disableVertical';
