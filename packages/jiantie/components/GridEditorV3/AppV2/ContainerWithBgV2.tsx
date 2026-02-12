import { cdnApi } from '@/services';
import React from 'react';
import BgAreaV2, { BgAreaProps } from '../components/Bg/BgAreaV2';
import LottieComp from '../components/LottieComp';
import { VideoBgConfig } from '../components/VideoBg/types';
import { LottieConfig } from '../types';
import { blockStyleFilter } from '../utils';
import { removeOssParamRegex } from '../utils/utils1';
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

// 提取背景地址并使用cdnApi处理
const extractAndProcessBgUrl = (
  bgValue?: string | React.CSSProperties['backgroundImage']
): React.CSSProperties['backgroundImage'] => {
  if (!bgValue) return undefined;

  // 从 backgroundImage 或 background 中提取 URL
  const bgString = String(bgValue);
  const urlMatch = bgString.match(/url\(['"]?([^'"]+)['"]?\)/);

  if (!urlMatch || !urlMatch[1]) {
    // 如果没有匹配到 URL，返回原值
    return bgValue as React.CSSProperties['backgroundImage'];
  }

  const rawUrl = urlMatch[1];
  // 移除现有的 OSS 参数
  const cleanUrl = removeOssParamRegex(rawUrl);

  // 使用 cdnApi 处理背景图（转换为 webp 格式）
  const processedUrl = cdnApi(cleanUrl, {
    format: 'webp',
    resizeWidth: 1080,
  });

  return `url("${processedUrl}")`;
};

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
    videoBgConfig: styleVideoBgConfig,
    ...otherStyle
  } = style || ({} as any);
  // 检查 children 中是否有混合模式元素
  // 如果 children 是单个元素且有混合模式，确保容器背景透明（避免 Safari 黑色底问题）
  const hasBlendMode = React.Children.toArray(children).some(child => {
    if (!React.isValidElement(child)) {
      return false;
    }
    const props = child.props as { style?: React.CSSProperties };
    const style = props?.style;
    if (!style || typeof style !== 'object') {
      return false;
    }
    // 检查混合模式属性（包括 WebKit 前缀）
    const cssStyle = style as React.CSSProperties & {
      WebkitMixBlendMode?: string;
    };
    return !!(cssStyle.mixBlendMode || cssStyle.WebkitMixBlendMode);
  });

  const containerStyle = clearUndefinedKey({
    ...otherStyle,
    borderRadius,
    position: 'relative',
    // 如果有混合模式，确保容器背景透明，避免 Safari 黑色底问题
    // 背景应该在 BgAreaV2 中，而不是在容器上
    ...(hasBlendMode
      ? {
          backgroundColor: 'transparent',
          background: 'none',
          backgroundImage: 'none',
        }
      : {}),
  } as React.CSSProperties);

  const resolvedVideoBgConfig = videoBgConfig || styleVideoBgConfig;

  // 处理 backgroundImage 和 background
  const processedBackgroundImage = extractAndProcessBgUrl(
    backgroundImage || background
  );

  // 判断 processedBackgroundImage 是否是有效的图片 URL（以 url( 开头）
  // 如果是颜色值，processedBackgroundImage 会是原值（颜色字符串），不应该用作 backgroundImage
  const isProcessedImageUrl =
    processedBackgroundImage &&
    String(processedBackgroundImage).trim().startsWith('url(');

  const _bgStyle = clearUndefinedKey(
    bgStyle ||
      ({
        ...blockStyleFilter(borderImage3 || {}),
        opacity: backgroundOpacity,
        // borderStyle: 'unset',
        borderImage2,
        borderRadius,
        foregroundStyle,
        // 如果处理后的背景图是有效的图片 URL，使用它并清除 background
        // 如果 background 是颜色值，保留它作为 background，并使用原来的 backgroundImage
        background: isProcessedImageUrl ? undefined : background,
        backgroundImage: isProcessedImageUrl
          ? processedBackgroundImage
          : backgroundImage,
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
          videoBgConfig={resolvedVideoBgConfig}
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
        videoBgConfig={resolvedVideoBgConfig}
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
