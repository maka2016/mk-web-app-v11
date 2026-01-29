export interface AnimationState {
  id: string;
  name: string;
  parameters: Record<string, any>;
  delay?: number;
  type: string;
}

export interface AnimateQueue2 {
  entrance?: AnimationState[];
  emphasis?: AnimationState[];
  exit?: AnimationState[];
}
