import React, { forwardRef, useEffect, useRef, useState } from 'react';

import styles from './index.module.scss';
import cls from 'classnames';

export interface Props {
  worksStore?: any;
  index: number;
  itemWidth: number;
  elemId: string;
  contentProps: any;
}

export const Item = ({
  index,
  itemWidth,
  elemId,
  contentProps,
  worksStore,
}: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (canvasRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          setHeight(newHeight);
        }
      });

      resizeObserver.observe(canvasRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  const scale = (itemWidth - 4) / 376;
  return (
    <div
      className={cls([styles.pageItem])}
      style={{
        width: itemWidth,
        maxWidth: itemWidth,
        position: 'relative',
        height: height ? `${height * scale}px` : 'auto',
      }}
    >
      <div
        ref={canvasRef}
        style={{
          width: 376,
          height: 'auto',
          pointerEvents: 'none',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      ></div>
    </div>
  );
};
