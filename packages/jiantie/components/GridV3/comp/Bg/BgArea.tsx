import React, { useEffect, useRef, useState } from 'react';
import BgContainer from './BgContainer';
import ClicpModeBgV3 from './ClicpModeBgV3';
import ClipModeBgV4 from './ClicpModeBgV4';

export interface BgAreaProps {
  style: React.CSSProperties & {
    backgroundGroup?: any;
    padding?: any;
    margin?: any;
    foregroundStyle?: any;
  };
  id: any;
  parallaxScrollBgConfig?: {
    coefficient: number;
  };
}

export default function BgArea(props: BgAreaProps) {
  const { style = {}, id, parallaxScrollBgConfig, ...otherProps } = props;
  const {
    backgroundGroup,
    padding,
    margin,
    foregroundStyle,
    display,
    width,
    height,
    ...otherStyle
  } = style;

  const [containerInfo, setContainerInfo] = useState({
    width: 0,
    height: 0,
  });
  const BgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (BgContainerRef.current) {
      const { width, height } = BgContainerRef.current.getBoundingClientRect();
      setContainerInfo({ width, height });
    }
    return () => {};
  }, [BgContainerRef, style]);

  const renderForeground = () => {
    if (foregroundStyle) {
      return (
        <BgContainer
          style={{
            ...(foregroundStyle || {}),
            zIndex: 11,
            pointerEvents: 'none',
          }}
          id={`foreground_${id}`}
          // 前景不需要视差效果
          parallaxScrollBgConfig={undefined}
        ></BgContainer>
      );
    }
    return null;
  };

  if (backgroundGroup && backgroundGroup.items?.filter(Boolean)?.length > 0) {
    const clipBgSettingV3 = backgroundGroup?.items?.map((item: any) => {
      if (!item) return null;
      const data = {
        ossPath: item.url,
        type: 'picture',
        width: item.width || null,
        height: item.height || null,
      };
      return data;
    });

    return (
      <BgContainer
        ref={BgContainerRef}
        {...otherProps}
        id={`bg_container_group_${id}`}
        parallaxScrollBgConfig={parallaxScrollBgConfig}
        style={{
          writingMode: otherStyle.writingMode,
        }}
      >
        {renderForeground()}
        <ClicpModeBgV3
          clipBgSettingV3={clipBgSettingV3}
          clipBgLayout={backgroundGroup?.layout || 'row'}
        />
      </BgContainer>
    );
  } else {
    return (
      <>
        {renderForeground()}
        <BgContainer
          id={`bg_container_${id}`}
          {...otherProps}
          ref={BgContainerRef}
          className='bg_container'
          parallaxScrollBgConfig={parallaxScrollBgConfig}
          style={{
            ...otherStyle,
            position: 'absolute',
          }}
        >
          {(otherStyle as any).borderImage2 ? (
            <ClipModeBgV4
              value={(otherStyle as any).borderImage2}
              key={JSON.stringify((otherStyle as any).borderImage2)}
            />
          ) : (
            <></>
          )}
        </BgContainer>
      </>
    );
  }
}
