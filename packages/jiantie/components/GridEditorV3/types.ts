import { LayerElemItem, PositionAttrs } from '@/components/GridEditorV3/works-store/types';

type PageAnimationTypeString =
  | 'none'
  | 'slide2'
  | 'slide' // 已经废弃的
  | 'fade'
  | 'scale'
  | 'flip'
  | 'rotate'
  | 'book';

export type PageAnimationConfig = {
  type: PageAnimationTypeString;
  duration?: number;
  delay?: number;
  easing?: string;
  autoplay?: boolean;
  /** 自动播放间隔，单位：秒，默认15秒 */
  autoplayInterval?: number;
};

export type CoverAnimationConfig = {
  type: 'page_flip' | 'vertical_split';
  coverUrl: [string, string];
  duration?: number;
  delay?: number;
  easing?: string;
  name: string;
  author: string;
};

/**
 * 模块
 */
export interface GridRow {
  position?: PositionAttrs;
  /**
   * 引用组件组的id，用于组内切换
   */
  componentGroupRefId?: string;
  /**
   * 引用的组件id，用于反向同步
   */
  sourceComponentId?: string;
  /** 从主题包添加的row的id */
  sourceRowId?: string;
  /**
   * 动态计算的row的深度，是一个运算值，无需持久化存储
   * 从根节点（gridsData）到当前节点的路径，例如：[0, 1, 2]，代表的是gridsData第0个row.children的第1个row.children的第2个row
   */
  depth?: number[];
  /**
   * 已废弃，使用themePackV3。主题包 strapi cms 的保存数据
   * @deprecated
   */
  cmsSettingForThemePack2?: {
    documentId: string;
    name: string;
    author: string;
    cover_url: string;
    material_tags_documentId: string;
  };
  /** 记录在画布的高度 */
  canvasHeight?: number;
  id: string;
  /**
   * 新增时保留id，如果没有新增row时会覆盖
   * 主要用于切换组件时保留原id
   */
  _id?: string;
  style?: React.CSSProperties;
  tag?: string;
  /** 列表是否反向 */
  listReverse?: boolean;
  name?: string;
  /** 别名 */
  alias?: string;
  /**
   * 单元格列表 (v1版本结构)
   * @deprecated 推荐使用 children 替代
   */
  cells?: GridCell[];
  /**
   * 子行列表 (v2版本结构)
   * 用于实现无限嵌套的网格，所有children都称为Cell
   */
  children?: GridRow[];
  /**
   * 子元素
   */
  childrenIds?: string[];
  animationType?: PageAnimationConfig;
  /** 是否是重复列表 */
  isRepeatList?: boolean;
  /** 是否是表格 */
  isTableView?: boolean;
  /** 重复列表的行数 */
  repeatRowCount?: number;
  /** 重复列表的列数 */
  repeatColumnCount?: number;
  repeatItemTemplate?: {
    style?: React.CSSProperties;
  };
  /**
   * 分组行id，指是GridRow.id
   * 替代rowsGroup，通过每次计算得出rowsGroup，避免数据错乱
   * @deprecated 2025-08-29 不再使用
   */
  groupByRowId?: string;
  groupStyle?: React.CSSProperties;
  /** 背景动画 */
  lottieBgConfig?: LottieConfig;
  /** 前景动画 */
  lottieFgConfig?: LottieConfig;
}

/**
 * 单元格
 */
export interface GridCell {
  tag?: 'grid_cell_root' | 'list_cell_root';
  id: string;
  style?: React.CSSProperties;
  childrenIds: string[];
  backgroundGroup?: BackgroundGroupType;
  /**
   * @deprecated
   * 废弃
   */
  isCopyable?: boolean;
}

export type LayoutType = 'row' | 'column' | 'clip9';

export interface BackgroundGroupType {
  type: '3' | '9';
  items: string[];
  layout?: LayoutType;
}
export interface BackgroundGroupType2 {
  type: '3' | '9';
  items: ({
    url: string;
    width: number;
    height: number;
  } | null)[];
  layout?: LayoutType;
}

export interface LottieConfig {
  url: string;
  loop: boolean;
  autoplay: boolean;
  speed: number;
}

export interface CopyRowData {
  rows: GridRow[];
  elemComps: LayerElemItem[];
}

export interface ComponentData {
  compId: string;
  compSourceRowId: string | undefined;
  compName: string;
  data: CopyRowData;
}

export interface ComponentGroupDataItem {
  groupId: string;
  datas: ComponentData[];
  groupName: string;
}

/**
 * 结构说明：
 * id 与 key 相同
 * name 是组件组的名称
 * datas 是下属所有组件的数据
 */
export type ComponentGroupData = ComponentGroupDataItem[];

/**
 * 组件实体数据，存储在 strapi 中
 */
export interface ComponentContent {
  /** 主题包的作品id */
  worksId: string;
  /** 存储 Grid 组件 */
  componentsGrids: ComponentGroupData;
  /** 存储 Block 组件 */
  componentsBlocks: ComponentGroupData;
}

interface MaterialResourceTypeForStrapi<T = Record<string, any>> {
  documentId: string;
  material_tags?: { documentId: string }[];
  content?: T;
}

export interface MaterialResourceItemForText {
  tag: string;
  type: 'text';
  content: string;
  name?: string; // 素材名称，用于图片和文字素材
}

export interface MaterialResourceItemForTextLib {
  tag: string;
  type: 'text_lib';
  // 指文字内容本身
  content: string;
  name?: string; // 素材名称，用于图片和文字素材
}

export interface MaterialResourceItemForPic {
  tag: string;
  type: 'pic';
  // 指url
  content: string;
  name?: string; // 素材名称，用于图片和文字素材
  attrs?: React.CSSProperties;
}

export interface MaterialResourceItemForComponent {
  tag: string;
  type: 'component';
  // 指 ComponentInstance 的 id
  content: string;
  name?: string; // 素材名称，用于图片和文字素材
}

export interface MaterialResourceItemForBlock {
  tag: string;
  type: 'block';
  // 使用复制的元素
  content: any;
  name?: string; // 素材名称，用于图片和文字素材
}

export interface MaterialResourceItemForThemeColor {
  tag: string;
  type: 'color';
  // 8个主题颜色
  content: ThemeColorType[];
  name?: string; // 素材名称，用于图片和文字素材
}

export type MaterialResourceItem =
  | MaterialResourceItemForText
  | MaterialResourceItemForTextLib
  | MaterialResourceItemForPic
  | MaterialResourceItemForComponent
  | MaterialResourceItemForThemeColor
  | MaterialResourceItemForBlock;

export interface MaterialGroup<T> {
  id: string;
  name: string;
  items: T[];
}

export interface MaterialResourcesGroup {
  text: MaterialGroup<MaterialResourceItemForText>[];
  text_lib: MaterialGroup<MaterialResourceItemForTextLib>[];
  pic: MaterialGroup<MaterialResourceItemForPic>[];
  component: MaterialGroup<MaterialResourceItemForComponent>[];
  color: MaterialGroup<MaterialResourceItemForThemeColor>[];
  block: MaterialGroup<MaterialResourceItemForBlock>[];
}

export interface UserEditorSetting {
  blockSelectable: boolean;
}

interface ThemePackV3RefData {
  /** 素材id */
  documentId: string;
  /** 关联的设计师主题作品 id */
  worksId: string;
}

/**
 * 定义组件数据结构
 */
export interface GridProps {
  /**
   * 类 html 结构的简帖作品数据结构，支持无限树形嵌套，css 布局和样式
   * 业务定义：
   * 第一层数组是pages，也是block，不能放置任何元素，元素需要放入第二层中
   * 第二层是grid，也是row
   */
  gridsData: GridRow[];
  id: string;
  /** 第一页是否显示为封面，如果是，则第一页需要翻页动画 */
  firstPageCover?: boolean;
  /** 用户编辑器设置 */
  userEditorSetting?: UserEditorSetting;
  materialResourcesGroup?: Partial<MaterialResourcesGroup>;
  /**
   * 关联主题包模式
   * 模版、作品模式下使用，与themePackV3互斥
   */
  themePackV3RefId?: ThemePackV3RefData;
  /**
   * 主题模式，与themePackV3RefId互斥，自身是主题包v3
   */
  themePackV3?: MaterialResourceTypeForStrapi<ComponentContent>;
  /**
   * 已废弃，使用themePackV3
   * @deprecated
   */
  themePackV2?: {
    documentId: string;
    name: string;
  };
  _updateVersion?: number;
  /**
   * 数据结构版本号，用于判断使用哪种数据结构
   * 空值：使用 cellsMap (v1结构)
   * v2：使用 gridsData (v2结构)
   */
  version?: 'v2' | 'v2.1';
  /**
   * v1版本数据结构 - 行映射表
   * @deprecated 推荐使用 gridsData 替代
   */
  cellsMap?: GridRow[];
  style?: React.CSSProperties;
  backgroundGroup?: BackgroundGroupType;
  coverAnimation?: CoverAnimationConfig;
  /** 风格 */
  themeConfig2?: ThemeConfigV2;
  parallaxScrollBgConfig?: {
    coefficient: number;
  };
  /** 背景动画 */
  lottieBgConfig?: LottieConfig;
  /** 前景动画 */
  lottieFgConfig?: LottieConfig;
}

export interface GridState {
  imageEditingOpen?: boolean;
  /** 是否显示填写名单弹窗 */
  showInviteeManager?: boolean;
  /** 是否显示下载邀请函弹窗 */
  showDownloadInviteeManager?: boolean;
  showDownloadPoster?: boolean;
  showPreviewModal?: boolean;
  /**
   * 当前激活的行的树状深度，代表当前激活的行在gridsData中的索引
   * 从根节点（gridsData）到当前节点的路径，例如：[0, 1, 2]，代表的是gridsData第0个row.children的第1个row.children的第2个row
   * 当长度为1时，选中的是页面
   */
  activeRowDepth?: number[];
  /** 编辑中的元素id */
  editingElemId?: string;
  /** 是否显示手机预览线 */
  showMobilePreviewLine?: boolean;
  isAddModalShow2?: boolean;
  /** 是否只渲染激活的画布 */
  onlyRenderActiveBlock?: boolean;
  /** 是否播放动画 */
  playAnimationInEditor?: boolean;
  isTagPickerOpen?: boolean;
  /** 是否隐藏操作区 */
  hideOperator?: boolean;
}

export interface ThemeColorType {
  /** 被其他元素引用的id */
  colorId: string;
  tag: 'primary' | 'secondary' | 'custom';
  type: 'color' | 'gradient';
  name: string;
  value: string;
}

/**
 * 风格设置
 */
export interface ThemeConfigV2 {
  /** 自定义颜色 */
  themeColors?: ThemeColorType[];
  /** 默认文字 */
  text_free: React.CSSProperties;
  /** 大标题 */
  text_heading1: React.CSSProperties;
  /** 副标题 */
  text_heading2: React.CSSProperties;
  /** 小标题 */
  text_heading3: React.CSSProperties;
  /** 段落 */
  text_body: React.CSSProperties;
  /** 描述 */
  text_desc: React.CSSProperties;
  /** 图片1 */
  photo1: React.CSSProperties;
  /** 图片2 */
  photo2: React.CSSProperties;
  /** 图片3 */
  photo3: React.CSSProperties;
  /** 图片4 */
  photo4: React.CSSProperties;
  /** 卡片 */
  block: React.CSSProperties;
  /** 容器（主要） */
  grid_main: React.CSSProperties;
  /** 容器（次要） */
  grid_sub: React.CSSProperties;
  /** 容器（强调） */
  grid_strong: React.CSSProperties;
  /** 容器（提示） */
  grid_info: React.CSSProperties;
  /** 自定义 */
  grid_free: React.CSSProperties;
  /** 通用网格 */
  grid_root: React.CSSProperties;
  /** 通用网格头部 */
  grid_root_head: React.CSSProperties;
  /** 通用网格内容 */
  grid_root_content: React.CSSProperties;
  /** 通用网格底部 */
  grid_root_footer: React.CSSProperties;
  /** 通用网格单元格 */
  grid_cell_root: React.CSSProperties;
  /** 用于强调 */
  grid_cell_2: React.CSSProperties;
  /** 列表 */
  list_root: React.CSSProperties;
  list_cell_root: React.CSSProperties;
  page: React.CSSProperties;
}

/** 不提取样式的标签 */
export const noTakeTag = ['photo4', 'text_free', 'grid_free'];
