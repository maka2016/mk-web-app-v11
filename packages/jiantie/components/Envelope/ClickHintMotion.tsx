import styled from '@emotion/styled';
import { Easing, motion } from 'motion/react';

// Lottie 动画参数：30fps, 59帧总时长 ≈ 1.967秒
const ANIMATION_DURATION = 59 / 30; // 1.967秒
const TOTAL_FRAMES = 59;

// 根据 Lottie 动画数据精确计算的配置
// 注意：关键帧的 frame 值是相对于整个动画的绝对帧数
const rippleConfigs: {
  layerStartFrame: number;
  scaleKeyframes: { frame: number; value: number }[];
  opacityKeyframes: { frame: number; value: number }[];
  scaleEase: Easing;
  opacityEase: Easing;
}[] = [
  {
    // circle 4: ip:0, st:0, op:59
    // 缩放：t:3 (62.2%) → t:29 (100%)
    // 透明度：t:5 (25%) → t:29 (0%)
    layerStartFrame: 0,
    scaleKeyframes: [
      { frame: 3, value: 0.622 },
      { frame: 29, value: 1.0 },
    ],
    opacityKeyframes: [
      { frame: 5, value: 0.25 },
      { frame: 29, value: 0 },
    ],
    scaleEase: [0.167, 0.167, 0.314, 1], // 根据 Lottie o/i 值
    opacityEase: [0.167, 0.167, 0.833, 0.833],
  },
  {
    // circle 5: ip:5, st:5, op:64 (实际到59帧)
    // 缩放：t:8 (62.2%) → t:34 (100%)，但34帧超出59帧，所以到59帧结束
    // 透明度：t:10 (25%) → t:34 (0%)
    layerStartFrame: 5,
    scaleKeyframes: [
      { frame: 8, value: 0.622 },
      { frame: 34, value: 1.0 },
    ],
    opacityKeyframes: [
      { frame: 10, value: 0.25 },
      { frame: 34, value: 0 },
    ],
    scaleEase: [0.167, 0.167, 0.314, 1],
    opacityEase: [0.167, 0.167, 0.833, 0.833],
  },
  {
    // circle 3: ip:10, st:10, op:69 (实际到59帧)
    // 缩放：t:13 (62.2%) → t:39 (100%)
    // 透明度：t:15 (25%) → t:39 (0%)
    layerStartFrame: 10,
    scaleKeyframes: [
      { frame: 13, value: 0.622 },
      { frame: 39, value: 1.0 },
    ],
    opacityKeyframes: [
      { frame: 15, value: 0.25 },
      { frame: 39, value: 0 },
    ],
    scaleEase: [0.167, 0.167, 0.314, 1],
    opacityEase: [0.167, 0.167, 0.833, 0.833],
  },
];

const ClickHintVisual = styled.div`
  position: relative;
  width: clamp(96px, 13vw, 150px);
  aspect-ratio: 1 / 1;
  pointer-events: none;
`;

const RippleCircle = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 1);
`;

const PulseCircle = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #000;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 2px;
  z-index: 11;
  /* background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.1) 55%,
    rgba(255, 255, 255, 0) 100%
  ); */
  background: rgba(255, 255, 255, 0.5);
`;

export const ClickHintMotion = ({
  text = (
    <div>
      <p>点击</p>
      <p>开启</p>
    </div>
  ),
}: {
  text?: any;
}) => {
  // 中心脉冲圆 "circle": 缩放 62.2% (帧3) → 70.2% (帧29) → 62.2% (帧55)
  // 注意：帧0-3之间保持62.2%，帧55-59之间保持62.2%，然后循环
  const pulseScaleTimes = [
    0,
    3 / TOTAL_FRAMES,
    29 / TOTAL_FRAMES,
    55 / TOTAL_FRAMES,
    1,
  ];
  const pulseScaleValues = [0.622, 0.622, 0.702, 0.622, 0.622];

  return (
    <ClickHintVisual aria-hidden title='中心脉冲圆'>
      {/* 中心脉冲圆 - 对应 Lottie 的 "circle" 图层 */}
      <PulseCircle
        initial={{ scale: 0.622 }}
        animate={{
          scale: pulseScaleValues,
        }}
        transition={{
          duration: ANIMATION_DURATION,
          repeat: Infinity,
          ease: [0.333, 0, 0.667, 1], // 根据 Lottie 的 o/i 值转换
          times: pulseScaleTimes,
        }}
      >
        {text}
      </PulseCircle>

      {/* 涟漪圆 - 对应 Lottie 的 "circle 4", "circle 5", "circle 3" 图层 */}
      {rippleConfigs.map((config, index) => {
        // 构建缩放动画的时间点和值
        // 注意：Lottie 中关键帧的 frame 是相对于整个动画的绝对帧数
        const scaleTimes: number[] = [];
        const scaleValues: number[] = [];

        // 在图层开始前，保持初始值
        if (config.layerStartFrame > 0) {
          scaleTimes.push(0);
          scaleValues.push(0.622);
        }

        // 添加关键帧（转换为相对于动画总时长的比例）
        config.scaleKeyframes.forEach(kf => {
          const time = kf.frame / TOTAL_FRAMES;
          scaleTimes.push(time);
          scaleValues.push(kf.value);
        });

        // 如果最后一个关键帧不在动画末尾，需要添加结束值
        const lastScaleFrame =
          config.scaleKeyframes[config.scaleKeyframes.length - 1].frame;
        if (lastScaleFrame < TOTAL_FRAMES) {
          scaleTimes.push(1);
          scaleValues.push(0.622); // 循环回到初始值
        }

        // 构建透明度动画的时间点和值
        const opacityTimes: number[] = [];
        const opacityValues: number[] = [];

        // 在图层开始前，保持初始值（0）
        if (config.layerStartFrame > 0) {
          opacityTimes.push(0);
          opacityValues.push(0);
        }

        // 在透明度动画开始前，保持初始值（0）
        const firstOpacityFrame = config.opacityKeyframes[0].frame;
        if (firstOpacityFrame > config.layerStartFrame) {
          opacityTimes.push(config.layerStartFrame / TOTAL_FRAMES);
          opacityValues.push(0);
          opacityTimes.push(firstOpacityFrame / TOTAL_FRAMES);
          opacityValues.push(0);
        }

        // 添加透明度关键帧
        config.opacityKeyframes.forEach(kf => {
          const time = kf.frame / TOTAL_FRAMES;
          opacityTimes.push(time);
          opacityValues.push(kf.value);
        });

        // 如果最后一个关键帧不在动画末尾，需要添加结束值
        const lastOpacityFrame =
          config.opacityKeyframes[config.opacityKeyframes.length - 1].frame;
        if (lastOpacityFrame < TOTAL_FRAMES) {
          opacityTimes.push(1);
          opacityValues.push(0); // 循环回到初始值
        }

        return (
          <RippleCircle
            key={index}
            initial={{
              scale: 0.622,
              opacity: 0,
            }}
            animate={{
              scale: scaleValues,
              opacity: opacityValues,
            }}
            transition={{
              scale: {
                duration: ANIMATION_DURATION,
                repeat: Infinity,
                ease: config.scaleEase,
                times: scaleTimes,
              },
              opacity: {
                duration: ANIMATION_DURATION,
                repeat: Infinity,
                ease: config.opacityEase,
                times: opacityTimes,
              },
            }}
          />
        );
      })}

      {/* <CenterDot /> */}
    </ClickHintVisual>
  );
};
