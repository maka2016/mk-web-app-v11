import React, { useRef } from 'react';
import { VideoBgConfig } from '../../../Envelope/types';
import BgContainer from './BgContainer';
import ClipModeBgV4 from './ClicpModeBgV4';
import VideoBg from './VideoBg';

export interface BgAreaProps {
  clipBgScale?: number;
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
  videoBgConfig?: VideoBgConfig;
}

export default function BgAreaV2(props: BgAreaProps) {
  const {
    style = {},
    id,
    parallaxScrollBgConfig,
    clipBgScale,
    videoBgConfig,
    ...otherProps
  } = props;
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

  const BgContainerRef = useRef<HTMLDivElement>(null);

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
        {/* 视频背景（最底层） */}
        {videoBgConfig && <VideoBg config={videoBgConfig} />}

        {/* 裁剪模式背景 */}
        {(otherStyle as any).borderImage2 ? (
          <ClipModeBgV4
            value={(otherStyle as any).borderImage2}
            key={JSON.stringify((otherStyle as any).borderImage2)}
            scale={clipBgScale}
          />
        ) : (
          <></>
        )}
      </BgContainer>
    </>
  );
}
