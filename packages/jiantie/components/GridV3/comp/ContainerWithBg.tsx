import React from 'react';
import BgArea, { BgAreaProps } from './Bg/BgArea';
import { useGridContext } from './provider';
import LottieComp from './Bg/LottieComp';
import { LottieConfig } from '../shared/types';

interface ComtainerWithBgProps extends React.HTMLAttributes<HTMLDivElement> {
  children: any;
  needBg?: boolean;
  parallelBg?: boolean;
  bgStyle?: React.CSSProperties;
  lottieBgConfig?: LottieConfig;
  lottieFgConfig?: LottieConfig;
  parallaxScrollBgConfig?: BgAreaProps['parallaxScrollBgConfig'];
  elemTag?: string;
}

function ContainerWithBg(
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
    elemTag,
    lottieBgConfig,
    lottieFgConfig,
    parallaxScrollBgConfig,
    ...other
  } = props;
  const { getStyleByTag2 } = useGridContext();
  const containerStyle = {
    ...(elemTag ? getStyleByTag2(elemTag as any) || {} : {}),
    ...style,
    position: 'relative',
    WebkitTextStroke: 'unset',
  } as React.CSSProperties;

  /** 自定义样式 */
  const isBorderSliceMode = !!(containerStyle as any).borderImage2;

  if (isBorderSliceMode) {
    delete containerStyle.borderImageSource;
    delete containerStyle.borderWidth;
  }

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

  const stackBg = ((style as any)?.layoutStyle as any)?.type === 'stack';
  const _bgStyle = bgStyle || {
    ...(stackBg ? (style as any)?.layoutStyle : style),
    maskImage: 'none',
    aspectRatio: 'auto',
    // borderRadius: "unset",
    backgroundGroup:
      (style as any)?.backgroundGroup ||
      (style as any)?.layoutStyle?.backgroundGroup,
    writingMode: (style as any)?.writingMode,
    transform: 'unset',
    width: 'unset',
    zIndex: 'unset',
    border: 'unset',
    borderColor: 'unset',
    ...(isBorderSliceMode
      ? {}
      : {
          borderWidth: 'unset',
          borderTopWidth: 'unset',
          borderBottomWidth: 'unset',
          borderLeftWidth: 'unset',
          borderRightWidth: 'unset',
        }),
  };

  if (id === 'editor_row_yimQAEjDfC') {
    console.log('_bgStyle', _bgStyle, bgStyle);
  }
  if (parallelBg) {
    return (
      <>
        <BgArea
          style={_bgStyle}
          id={`bg_for_${id}`}
          parallaxScrollBgConfig={parallaxScrollBgConfig}
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
      <BgArea
        style={_bgStyle}
        id={`bg_for_${id}`}
        parallaxScrollBgConfig={parallaxScrollBgConfig}
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

export default React.forwardRef(ContainerWithBg);
