export type Direction = 'up' | 'down' | 'left' | 'right';
export type ApplyMode = 'both' | 'entrance' | 'exit';
export type TransformOrigin = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type Easing = 'linear' | 'outQuad' | 'inOutQuad' | 'outBack' | 'outElastic';

export interface AnimationState {
  id: string;
  name: string;
  parameters: Record<string, any>;
  delay?: number;
  type: string;
  direction?: Direction;
  applyMode?: ApplyMode;
  transformOrigin?: TransformOrigin;
  easing?: Easing;
}

export interface AnimateQueue2 {
  entrance?: AnimationState[];
  emphasis?: AnimationState[];
  exit?: AnimationState[];
}
