export interface AnimationState {
  type: string;
  infinite: boolean;
  timing: string;
  delay: string;
  duration: string;
  emphasisDuration?: string; // 强调动画的总时长，单位秒
  alternate?: boolean; // 是否往返播放
}

export interface AnimateQueue {
  entrance?: AnimationState[];
  emphasis?: AnimationState[];
  exit?: AnimationState[];
}
