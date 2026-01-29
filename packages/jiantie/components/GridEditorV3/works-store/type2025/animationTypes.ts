// Type definitions for animejs 3.1
// Project: http://animejs.com
// Definitions by: Andrew Babin     <https://github.com/A-Babin>
//                 supaiku0         <https://github.com/supaiku0>
//                 southrock         <https://github.com/southrock>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.4

export type IObject<T = any> = Record<string, T>;

export type FunctionBasedParameter = (
  element: HTMLElement,
  index: number,
  length: number
) => number;
export type AnimeCallbackFunction = (anim: AnimeInstance) => void;
export type CustomEasingFunction = (
  el: HTMLElement,
  index: number,
  length: number
) => (time: number) => number;
// Allowing null is necessary because DOM queries may not return anything.
export type AnimeTarget =
  | string
  | IObject
  | HTMLElement
  | SVGElement
  | NodeList
  | null;

export type EasingOptions =
  | 'linear'
  | 'easeInQuad'
  | 'easeInCubic'
  | 'easeInQuart'
  | 'easeInQuint'
  | 'easeInSine'
  | 'easeInExpo'
  | 'easeInCirc'
  | 'easeInBack'
  | 'easeInElastic'
  | 'easeInBounce'
  | 'easeOutQuad'
  | 'easeOutCubic'
  | 'easeOutQuart'
  | 'easeOutQuint'
  | 'easeOutSine'
  | 'easeOutExpo'
  | 'easeOutCirc'
  | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce'
  | 'easeInOutQuad'
  | 'easeInOutCubic'
  | 'easeInOutQuart'
  | 'easeInOutQuint'
  | 'easeInOutSine'
  | 'easeInOutExpo'
  | 'easeInOutCirc'
  | 'easeInOutBack'
  | 'easeInOutElastic'
  | 'easeInOutBounce';
export type DirectionOptions = 'reverse' | 'alternate' | 'normal';

export interface AnimeCallBack {
  begin?: AnimeCallbackFunction | undefined;
  change?: AnimeCallbackFunction | undefined;
  update?: AnimeCallbackFunction | undefined;
  complete?: AnimeCallbackFunction | undefined;
  loopBegin?: AnimeCallbackFunction | undefined;
  loopComplete?: AnimeCallbackFunction | undefined;
  changeBegin?: AnimeCallbackFunction | undefined;
  changeComplete?: AnimeCallbackFunction | undefined;
}

export interface AnimeInstanceParams extends AnimeCallBack {
  loop?: number | boolean | undefined;
  autoplay?: boolean | undefined;
  direction?: DirectionOptions | string | undefined;
}

export interface AnimeAnimParams extends AnimeCallBack {
  targets?: AnimeTarget | ReadonlyArray<AnimeTarget> | undefined;

  duration?: number | FunctionBasedParameter | undefined;
  delay?: number | FunctionBasedParameter | undefined;
  endDelay?: number | FunctionBasedParameter | undefined;
  elasticity?: number | FunctionBasedParameter | undefined;
  round?: number | boolean | FunctionBasedParameter | undefined;
  keyframes?: ReadonlyArray<AnimeAnimParams> | undefined;

  easing?: EasingOptions | CustomEasingFunction;

  [AnyAnimatedProperty: string]: any;
  scale?: Array<{
    value: number;
    duration: number;
    delay: number;
    easing: AnimeAnimParams['easing'];
  }>;
  opacity?: Array<{
    value: number;
    duration: number;
    delay: number;
    easing: AnimeAnimParams['easing'];
  }>;
}

export interface AnimeParams extends AnimeInstanceParams, AnimeAnimParams {
  // Just need this to merge both Params interfaces.
}

export interface Animatable {
  id: number;
  target: HTMLElement;
  total: number;
  transforms: IObject;
}

export interface Animation {
  animatable: Animatable;
  currentValue: string;
  delay: number;
  duration: number;
  endDelay: number;
  property: string;
  tweens: ReadonlyArray<IObject>;
  type: string;
}

export interface AnimeInstance extends AnimeCallBack {
  play(): void;
  pause(): void;
  restart(): void;
  reverse(): void;
  seek(time: number): void;
  tick(time: number): void;

  began: boolean;
  paused: boolean;
  completed: boolean;
  finished: Promise<void>;

  autoplay: boolean;
  currentTime: number;
  delay: number;
  direction: string;
  duration: number;
  loop: number | boolean;
  timelineOffset: number;
  progress: number;
  remaining: number;
  reversed: boolean;

  animatables: ReadonlyArray<Animatable>;
  animations: ReadonlyArray<Animation>;
}

export interface AnimeTimelineAnimParams extends AnimeAnimParams {
  timelineOffset: number | string | FunctionBasedParameter;
}

export interface AnimeTimelineInstance extends AnimeInstance {
  add(
    params: AnimeAnimParams,
    timelineOffset?: string | number
  ): AnimeTimelineInstance;
}

export interface StaggerOptions {
  start?: number | string | undefined;
  direction?: 'normal' | 'reverse' | undefined;
  easing?: CustomEasingFunction | string | EasingOptions | undefined;
  grid?: ReadonlyArray<number> | undefined;
  axis?: 'x' | 'y' | undefined;
  from?: 'first' | 'last' | 'center' | number | undefined;
}

// Helpers

export interface IHelpers {
  version: string;
  speed: number;
  running: AnimeInstance[];
  easings: { [EasingFunction: string]: (t: number) => any };
}

export type remove = (
  targets: AnimeTarget | ReadonlyArray<AnimeTarget>
) => void;
export type get = (targets: AnimeTarget, prop: string) => string | number;
export type path = (
  path: string | HTMLElement | SVGElement | null,
  percent?: number
) => (prop: string) => {
  el: HTMLElement | SVGElement;
  property: string;
  totalLength: number;
};
export type setDashoffset = (el: HTMLElement | SVGElement | null) => number;
export type bezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => (t: number) => number;
export type stagger = (
  value: number | string | ReadonlyArray<number | string>,
  options?: StaggerOptions
) => FunctionBasedParameter;
export type set = (
  targets: AnimeTarget,
  value: { [AnyAnimatedProperty: string]: any }
) => void;
// Timeline
export type timeline = (
  params?: AnimeParams | ReadonlyArray<AnimeInstance>
) => AnimeTimelineInstance;
export type random = (min: number, max: number) => number;
