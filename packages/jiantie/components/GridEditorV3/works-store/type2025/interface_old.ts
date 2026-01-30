import { AnimationMeta } from './animation';

/**
 * 作品数据
 * @deprecated 已废弃，保留仅用于向后兼容
 */
export class IWorksData2025 {
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
}

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
}

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

  /** 背景数据 */
  background!: WorksBackground;

  width!: number;

  height!: number;

  /** 前景，不可交互 */
  frontground?: {
    url: string;
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
/**
 * 页面
 */
export type Pages = WorksPage[];
