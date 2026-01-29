import React from 'react';

import { cdnApi } from '@/services';
import { cn } from '@workspace/ui/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  direction?: 'left' | 'right' | 'down';
}

const url = 'https://img2.maka.im/assets/usual/slideguide-1-view.png';

const FlipIndicator: React.FC<Props> = (props: Props) => {
  const { className, direction = 'down', ...attrs } = props;

  // 根据方向计算动画类
  const getDirectionStyles = () => {
    switch (direction) {
      case 'left':
        return {
          animation: 'animate-arrowing-left',
        };
      case 'right':
        return {
          animation: 'animate-arrowing-right',
        };
      case 'down':
      default:
        return {
          animation: 'animate-arrowing',
        };
    }
  };

  const styles = getDirectionStyles();

  return (
    <div
      className={cn(
        'z-[111] absolute bottom-5 left-1/2 w-[30px] text-center -ml-3 after:content-[""] after:absolute after:-left-2.5 after:-top-2.5 after:-right-2.5 after:-bottom-2.5',
        className
      )}
      {...attrs}
      onClick={() => {
        // dispatch next page event
        window.dispatchEvent(new CustomEvent('next_page'));
      }}
    >
      <img
        src={cdnApi(url)}
        alt='翻页指示器'
        className={cn(
          'w-full drop-shadow-[0px_1px_1px_rgba(0,0,0,0.5)]',
          styles.animation
        )}
      />
    </div>
  );
};

export default FlipIndicator;
