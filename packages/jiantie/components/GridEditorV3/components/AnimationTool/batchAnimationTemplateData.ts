/**
 * 批量动画模板统一数据：参考 new-elem-animation-prd 预设库。
 * 场景式含 entrance/emphasis/exit 定义，应用时仅写入 entrance 与 emphasis（不写入 exit），emphasis 播放次数为 3。
 * 功能式仅 entrance。
 */
import { cdnApi } from '@/services';

/** 场景式：进场 + 可选强调 + 退场 */
export interface SceneAnimationIds {
  entrance: string;
  emphasis?: string;
  exit?: string;
}

/** 按元素类型映射：string 为仅 entrance，对象为 entrance+emphasis+exit */
export type BatchTemplateTypeValue = string | SceneAnimationIds;

export interface BatchTemplateType {
  default: BatchTemplateTypeValue;
  Text?: BatchTemplateTypeValue;
  absoluteElem?: BatchTemplateTypeValue;
  odd?: BatchTemplateTypeValue;
  even?: BatchTemplateTypeValue;
}

/** 分类：场景动画 | 通用 */
export type BatchTemplateGroup = 'scene' | 'common';

export interface BatchTemplateItem {
  id: string;
  name: string;
  description?: string;
  duration: number;
  delayTime: number;
  type: BatchTemplateType;
  /** 分类：场景动画 / 通用 */
  group: BatchTemplateGroup;
  /** 有则显示预览图，无则显示占位；所有项均支持 hover 播放预览 */
  preview?: string;
  activePreview?: string;
}

/** 场景动画分类（参考 PRD §3–6）：情感与婚礼、商务与科技、高转化与强调、物理动力学 */
const sceneTemplates: BatchTemplateItem[] = [
  {
    id: 'wedding-elegant',
    name: '婚礼优雅',
    group: 'scene',
    duration: 3000,
    delayTime: 150,
    type: {
      default: 'common-entrance-rise-linear',
      Text: 'common-entrance-rise-linear',
      absoluteElem: 'common-entrance-rise-linear',
    },
  },
  {
    id: 'wedding-cheerful',
    name: '婚礼欢快',
    group: 'scene',
    duration: 1500,
    delayTime: 100,
    type: {
      default: {
        entrance: 'common-entrance-blur',
        emphasis: 'common-emphasis-float',
      },
      Text: {
        entrance: 'common-entrance-fade',
        emphasis: 'common-emphasis-heartbeat',
      },
      absoluteElem: {
        entrance: 'common-entrance-3d-flip',
      },
    },
  },
  {
    id: 'wedding-luxury',
    name: '婚礼高端',
    group: 'scene',
    duration: 2000,
    delayTime: 100,
    type: {
      default: {
        entrance: 'common-entrance-fade',
      },
      Text: {
        entrance: 'text-entrance-rise',
      },
      absoluteElem: {
        entrance: 'common-entrance-slide-left',
      },
    },
  },
  {
    id: 'business',
    name: '商务与科技',
    group: 'scene',
    duration: 600,
    delayTime: 80,
    type: {
      default: {
        entrance: 'common-entrance-fade',
        exit: 'common-exit-fade',
      },
      Text: {
        entrance: 'text-entrance-rise',
        exit: 'common-exit-fade',
      },
      absoluteElem: {
        entrance: 'common-entrance-slide-left',
      },
    },
  },
  {
    id: 'conversion',
    name: '高转化与强调',
    group: 'scene',
    duration: 800,
    delayTime: 100,
    type: {
      default: {
        entrance: 'common-entrance-pop',
        emphasis: 'common-emphasis-pop',
      },
      Text: {
        entrance: 'common-entrance-pop',
        emphasis: 'common-emphasis-jelly',
      },
      absoluteElem: {
        entrance: 'common-entrance-scale',
        emphasis: 'common-emphasis-pulse',
      },
    },
  },
  {
    id: 'physics',
    name: '物理动力学',
    group: 'scene',
    duration: 800,
    delayTime: 100,
    type: {
      default: {
        entrance: 'common-entrance-bounce-in',
        exit: 'common-exit-scale',
      },
      Text: {
        entrance: 'text-entrance-bounce',
        exit: 'common-exit-fade',
      },
      odd: {
        entrance: 'common-entrance-roll-left',
      },
      even: {
        entrance: 'common-entrance-roll-right',
      },
    },
  },
];

/** 通用分类 */
const functionTemplates: BatchTemplateItem[] = [
  {
    id: 'simple',
    name: '简约',
    group: 'common',
    duration: 500,
    delayTime: 100,
    type: {
      default: 'common-entrance-rise',
      Text: 'common-entrance-fade',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_jianyue_active.png'),
  },
  {
    id: 'smooth',
    name: '流畅',
    group: 'common',
    duration: 500,
    delayTime: 60,
    type: {
      default: 'common-entrance-pop-bottom',
      Text: 'text-entrance-slide',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_jianyue_active.png'),
  },
  {
    id: 'fun',
    name: '趣味',
    group: 'common',
    duration: 500,
    delayTime: 100,
    type: {
      default: 'common-entrance-fall',
      absoluteElem: 'common-entrance-rise',
      Text: 'text-entrance-shift',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_jianyue_active.png'),
  },
  {
    id: 'party',
    name: '派对',
    group: 'common',
    duration: 500,
    delayTime: 100,
    type: {
      default: 'common-entrance-slide-right',
      absoluteElem: 'common-entrance-slide-left',
      Text: 'common-entrance-pop',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_jianyue_active.png'),
  },
  {
    id: 'corporate',
    name: '企业风',
    group: 'common',
    duration: 500,
    delayTime: 100,
    type: {
      default: 'common-entrance-fade',
      Text: 'common-entrance-rise',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_jianyue_active.png'),
  },
  {
    id: 'rise',
    name: '上升',
    group: 'common',
    duration: 1000,
    delayTime: 200,
    type: { default: 'common-entrance-rise' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_shangsheng.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_shangsheng_active.png?v=1'),
  },
  {
    id: 'slide',
    name: '平移',
    group: 'common',
    duration: 1000,
    delayTime: 100,
    type: { default: 'common-entrance-slide-right' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_furu.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_furu_active.png'),
  },
  {
    id: 'fade',
    name: '淡入',
    group: 'common',
    duration: 1000,
    delayTime: 200,
    type: { default: 'common-entrance-fade' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_danru.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_danru_active.png?v=1'),
  },
  {
    id: 'wipe',
    name: '擦除',
    group: 'common',
    duration: 300,
    delayTime: 200,
    type: { default: 'common-entrance-wipe' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_cachu.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_cachu_active.png'),
  },
  {
    id: 'pop',
    name: '弹出',
    group: 'common',
    duration: 500,
    delayTime: 100,
    type: { default: 'common-entrance-pop' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_tanchu.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_tanchu_active.png'),
  },
  {
    id: 'roll',
    name: '滚动',
    group: 'common',
    duration: 300,
    delayTime: 100,
    type: {
      odd: 'common-entrance-roll-left',
      even: 'common-entrance-roll-right',
      default: 'common-entrance-slide-left',
    },
    preview: cdnApi('/cdn/editor7/animation_template/preview_gundong.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_gundong_active.png'),
  },
  {
    id: 'pop-bottom',
    name: '底部弹出',
    group: 'common',
    duration: 300,
    delayTime: 100,
    type: { default: 'common-entrance-pop-bottom' },
    preview: cdnApi('/cdn/editor7/animation_template/preview_dibutanchu.png'),
    activePreview: cdnApi('/cdn/editor7/animation_template/preview_dibutanchu_active.png'),
  },
];

/** 合并后的批量动画模板列表：场景 + 功能 */
export const batchAnimationTemplateList: BatchTemplateItem[] = [...sceneTemplates, ...functionTemplates];
