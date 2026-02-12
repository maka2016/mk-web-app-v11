import { GridProps } from '../../utils';
import { AnimateQueue } from './animate';
import { AnimateQueue2 } from './animate2';

export type LayerElemItemMap = Record<string, LayerElemItem>;

/** 动画分组（时间轴内多轨道一起移动） */
export interface AnimationGroup {
  id: string;
  name?: string;
  elemIds: string[];
}

/**
 * 作品数据最新定义
 */
export class IWorksData {
  /** 新版数据的判定 */
  isGridMode!: boolean;
  gridProps!: GridProps;
  /**
   * @deprecated 已废弃，保留仅用于向后兼容
   */
  gridsProps?: GridProps;
  layersMap!: LayerElemItemMap;
  music!: IMusic;
  /** 动画分组，用于时间轴内多轨道一起移动 */
  animationGroups?: AnimationGroup[];
  /** 时间轴显示顺序（仅元素模式），混合 elemId 和 "group:groupId" */
  animationTimelineOrder?: string[];
  /** @deprecated 已废弃，保留仅用于向后兼容 */
  _version?: number;
}

/**
 * 旧版数据，需要做数据迁移
 * @deprecated 已废弃，保留仅用于向后兼容
 */
export class IWorksDataLegacy {
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
      pages: WorksPage[];
    };
    /** 动作配合，可以先忽略 */
    actions: ActionsMap;
    /** 音乐库 */
    music: IMusic;
  };

  /** 元素在画布中的容器的定位信息 */
  positionLink!: PositionLinkMap;
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
 * 元素在画布中的数据定义
 * @deprecated 已废弃，保留仅用于向后兼容
 */
export class IPositionLink {
  /** 图层名字 */
  name?: string;
  /**
   * 动画队列
   * @deprecated 已废弃，保留仅用于向后兼容
   */
  animateQueue?: AnimateQueue;
  /**
   * 动画队列2
   * 目前主要的功能
   */
  animateQueue2?: AnimateQueue2;
  action?: {
    enable: boolean;
    /** 动作类型：link=跳转链接, goToPage=内部页面跳转, playAnimation=播放当前页动画, phone=拨打电话 */
    type: 'link' | 'goToPage' | 'playAnimation' | 'phone';
    label?: string;
    actionAttrs: {
      /** type='link' 时的跳转 URL */
      link?: string;
      /** type='link' 时是否新窗口打开 */
      openInNewTab?: boolean;
      /** type='goToPage' 时的目标页码（0-based） */
      pageIndex?: number;
      /** 其他扩展属性 */
      [key: string]: unknown;
    };
  };
  // 元素标签
  tag?: string;
}

/**
 * @deprecated 已废弃，保留仅用于向后兼容
 */
export type PositionLinkMap = Record<string, IPositionLink>;

/**
 * 布局元素，需要合并
 */
export class LayerElemItem<T = any> extends IPositionLink {
  /** 元素类型  */
  type!: 'container' | 'element';

  /** 传入到组件的属性  */
  attrs!: ContentAttrs & T;

  /** element id */
  elemId!: string;

  /** 组件的引用 */
  elementRef!: string;
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

type PositionConstraint =
  | 'left-top'
  | 'right-top'
  | 'left-bottom'
  | 'right-bottom';

export interface PositionAttrs {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  constraint?: PositionConstraint;
  relativeTo?: 'parent' | 'block';
}

export interface CommonAttrs {
  /** 是否自由元素 */
  absoluteElem?: boolean;
  /** 位置属性，当absoluteElem为true时生效 */
  position?: PositionAttrs;
  /** 是否禁用编辑 */
  disabledToEdit?: boolean;
  /** 布局样式 */
  layoutStyle?: React.CSSProperties & { transformObject?: { rotate?: number } };
  /** 版本号 */
  _v?: number;
  /** 系统变量 */
  systemVariable?: {
    enabled?: boolean;
    label?: string;
    key?: string;
    placeholder?: string;
    removed?: boolean;
  };
}

/**
 * 由右边编辑面板产出的数据
 */
export type ContentAttrs = {
  [key: string]: any;
} & CommonAttrs;

/**
 * 页面配置数据
 * @deprecated 已废弃，保留仅用于向后兼容
 */
export class WorksPage {
  id!: string;

  /** 图层 */
  layers!: LayerElemItem[];

  width!: number;

  height!: number;
}

export type AddComponentParams = Partial<LayerElemItem>;
