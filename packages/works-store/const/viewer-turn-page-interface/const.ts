export interface TurnPageAnimationItem {
  /** 类型 */
  type: string;
  alias: string;
  imgUrl: string;

  disable?: boolean;
}

export const TurnPageAnimationMapping: Record<string, TurnPageAnimationItem> = {
  layer: {
    type: 'layer',
    alias: '层叠',
    imgUrl: '/cdn/editor7/animation-gif/%E5%B1%82%E5%8F%A0.gif',
  },
  cover: {
    type: 'cover',
    alias: '覆盖',
    imgUrl: '/cdn/editor7/animation-gif/覆盖.gif',
  },
  fold: {
    type: 'fold',
    alias: '折叠',
    imgUrl: '/cdn/editor7/animation-gif/折叠.gif',
  },
  spin: {
    type: 'spin',
    alias: '旋转',
    imgUrl: '/cdn/editor7/animation-gif/旋转.gif',
  },
  fade: {
    type: 'fade',
    alias: '淡入淡出',
    imgUrl: '/cdn/editor7/animation-gif/淡入淡出.gif',
  },
  scale: {
    // disable: true,
    type: 'scale',
    alias: '缩放',
    imgUrl: '/assets/usual/icon_statistics/carouup.png',
  },
  evolve: {
    type: 'evolve',
    // disable: true,
    alias: '推进',
    imgUrl: '/assets/usual/icon_statistics/default.png',
  },
  RubikCube: {
    type: 'RubikCube',
    // disable: true,
    alias: '魔方',
    imgUrl: '/assets/usual/icon_statistics/cubedown.png',
  },
};

export const TurnPageIndicatorMapping = {
  none: {
    type: 'none',
    imgUrl: 'none',
    alias: '无',
  },
  slim: {
    type: 'slim',
    imgUrl: '/assets/usual/slideguide-1-view.png',
  },
  flat: {
    type: 'flat',
    imgUrl: '/assets/usual/slideguide-2-view.png',
  },
  double: {
    type: 'double',
    imgUrl: '/assets/usual/slideguide-3-view.png',
  },
  cube: {
    type: 'cube',
    imgUrl: '/assets/usual/slideguide-4-view.png',
  },
};

export const TurnPageNumberMapping = {
  none: {
    type: 'none',
    alias: '无',
  },
  leftBottom: {
    type: 'leftBottom',
    alias: '底部左侧',
  },
  rightBottom: {
    type: 'rightBottom',
    alias: '底部右侧',
  },
  topCenter: {
    type: 'topCenter',
    alias: '顶部中央',
  },
};
