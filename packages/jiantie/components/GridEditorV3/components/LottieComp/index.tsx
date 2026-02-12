import React, { useEffect, useRef } from 'react';
import { GridProps } from '../../utils';
// import { loadLottieDataFromZip } from './loadLottieDataFromZip';

interface LottieCompProps extends React.HTMLAttributes<HTMLDivElement> {
  lottieConfig?: GridProps['lottieBgConfig'];
}

export default function LottieComp({
  lottieConfig,
  ...props
}: LottieCompProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !lottieConfig) return;
    try {
      // loadLottieDataFromZip(lottieConfig?.url || '').then(animationData => {
      //   if (!containerRef.current) return;
      //   const animation = lottie.loadAnimation({
      //     container: containerRef.current,
      //     renderer: 'svg',
      //     loop: false,
      //     autoplay: false,
      //     animationData,
      //   });

      //   // 添加事件监听器来调试
      //   animation.addEventListener('data_ready', () => {
      //     console.log('Lottie animation loaded successfully');
      //   });

      //   animation.addEventListener('error', error => {
      //     console.error('Lottie animation error:', error);
      //   });

      //   EventEmitter.on('viewer-ready', () => {
      //     animation.play();
      //   });
      // });
    } catch (error) {
      console.error('Failed to load Lottie animation:', error);
    }
  }, []);
  return null

  // if (!lottieConfig) return null;

  // return (
  //   <div
  //     ref={containerRef}
  //     {...props}
  //     data-tip='lottie-comp'
  //     style={{ ...(props.style || {}), pointerEvents: 'none' }}
  //   />
  // );
}
