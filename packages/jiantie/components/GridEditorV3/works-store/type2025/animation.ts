import { AnimeParams } from './animationTypes';

export interface AnimationMeta {
  label: string;
  /** 业务字段动画类型 */
  bizType: 'enter' | 'action' | 'out';
  /** 动画时长 毫秒 */
  duration: number;
  /** 贝塞尔曲线类型 */
  timingFunction: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** 延时 毫秒 */
  delay: number;
  animationRef: string;
  /** 属性指示动画是否反向播放  https://developer.mozilla.org/zh-CN/docs/Web/CSS/animation-direction */
  direction: 'normal' | 'alternate' | 'alternate-reverse' | 'reverse';
  /** 设置CSS动画在执行之前和之后如何将样式应用于其目标 */
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  /** 定义动画在结束前运行的次数 可以是1次 无限循环. */
  iterationCount: 'infinite' | number;
  /** 动画播放顺序 */
  order?: number;
  /** 动画组内顺序 */
  groupOrder?: number;
  /** 是否渐入 */
  fadeIn?: boolean;
}

export interface ITransformNumberDict {
  /** 单位 */
  unit: string;
  /** 值 */
  value: number;
}

export interface AnimationInput {
  timingFunction: number[] | AnimationMeta['timingFunction'];
  opacity: number;
  translate3D: ITransformNumberDict[];
  scale: number[];
  skew: ITransformNumberDict[];
  perspective: ITransformNumberDict;
  /** 旋转的描述， 前三个数是数字 最后一个数是 ITransformNumberDict */
  rotate3d: (ITransformNumberDict | number)[];
}

export interface AnimationInputStr {
  timingFunction: string;
  opacity: string;
  translate3D: string;
  scale: string;
  skew: string;
  perspective: string;
  rotate3d: string;
}

export interface AnimationResult {
  css: string;
  outInput: AnimationInput;
  animationParams: AnimeParams;
}

export type Factory = (
  id: string,
  input: AnimationInput,
  index?: number
) => AnimationResult;

export interface AnimationObj {
  factory: Factory;
  meta: AnimationMeta;
}

export interface CssStr {
  keyframsStr: string;
  animationStr: string;
  animationName: string[];
  delays: number[];
  durations: number[];
}
