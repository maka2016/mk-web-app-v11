import React from 'react';
import { VideoBgConfig } from '../../Envelope/types';
import { blockStyleFilter } from '../shared';
import { LottieConfig } from '../shared/types';
import BgAreaV2, { BgAreaProps } from './Bg/BgAreaV2';
import LottieComp from './Bg/LottieComp';
import { clearUndefinedKey } from './utils';

interface ComtainerWithBgProps extends React.HTMLAttributes<HTMLDivElement> {
  clipBgScale?: number;
  children?: any;
  needBg?: boolean;
  parallelBg?: boolean;
  bgStyle?: React.CSSProperties;
  lottieBgConfig?: LottieConfig;
  lottieFgConfig?: LottieConfig;
  parallaxScrollBgConfig?: BgAreaProps['parallaxScrollBgConfig'];
  videoBgConfig?: VideoBgConfig;
}

function ContainerWithBgV2(
  props: ComtainerWithBgProps,
  ref: React.Ref<HTMLDivElement>
) {
  const {
    children,
    style,
    id,
    needBg = true,
    parallelBg = false,
    bgStyle,
    lottieBgConfig,
    lottieFgConfig,
    parallaxScrollBgConfig,
    clipBgScale,
    videoBgConfig,
    ...other
  } = props;
  const {
    borderImage2,
    borderImage3,
    borderRadius,
    foregroundStyle,
    background,
    backgroundImage,
    backgroundPosition,
    backgroundRepeat,
    backgroundAttachment,
    backgroundSize,
    backgroundColor,
    backgroundOpacity,
    ...otherStyle
  } = style || ({} as any);
  const containerStyle = clearUndefinedKey({
    ...otherStyle,
    borderRadius,
    position: 'relative',
  } as React.CSSProperties);

  const _bgStyle = clearUndefinedKey(
    bgStyle ||
      ({
        ...blockStyleFilter(borderImage3 || {}),
        opacity: backgroundOpacity,
        // borderStyle: 'unset',
        borderImage2,
        borderRadius,
        foregroundStyle,
        background,
        backgroundImage,
        backgroundColor,
        backgroundPosition,
        backgroundRepeat,
        backgroundAttachment,
        backgroundSize,
      } as any)
  );

  if (!needBg) {
    return (
      <div {...other} style={containerStyle} id={id} ref={ref}>
        {children}
      </div>
    );
  }

  if (lottieBgConfig) {
    return (
      <div {...other} style={containerStyle} id={id} ref={ref}>
        <LottieComp
          {...other}
          key={`lottie-bg_${lottieBgConfig?.url || ''}`}
          id={`${id}_lottie-bg`}
          lottieConfig={lottieBgConfig}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {children}
        <LottieComp
          {...other}
          key={`lottie-fg_${lottieFgConfig?.url || ''}`}
          id={`${id}_lottie-fg`}
          lottieConfig={lottieFgConfig}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1111,
          }}
        />
      </div>
    );
  }

  if (parallelBg) {
    return (
      <>
        <BgAreaV2
          style={_bgStyle}
          id={`bg_for_${id}`}
          parallaxScrollBgConfig={parallaxScrollBgConfig}
          clipBgScale={clipBgScale}
          videoBgConfig={videoBgConfig}
          key={
            _bgStyle.background ||
            _bgStyle.backgroundImage ||
            _bgStyle.backgroundColor
          }
        />
        <div {...other} style={containerStyle} id={id} ref={ref}>
          {children}
        </div>
      </>
    );
  }
  return (
    <div {...other} style={containerStyle} id={id} ref={ref}>
      <BgAreaV2
        style={_bgStyle}
        id={`bg_for_${id}`}
        parallaxScrollBgConfig={parallaxScrollBgConfig}
        clipBgScale={clipBgScale}
        videoBgConfig={videoBgConfig}
        key={
          _bgStyle.background ||
          _bgStyle.backgroundImage ||
          _bgStyle.backgroundColor
        }
      />
      {children}
    </div>
  );
}

export default React.forwardRef(ContainerWithBgV2);
