import { cdnApi } from '@mk/services';
import { EnvelopeConfig } from './types';

interface EnvelopePreloadProps {
  config?: EnvelopeConfig;
}

/**
 * 信封图片预加载组件 - 在 SSR 阶段输出 preload 标签
 * 这个组件会在服务端渲染时生成 <link rel="preload"> 标签，
 * 让浏览器在解析 HTML 时就开始下载关键图片资源
 */
export function EnvelopePreload({ config }: EnvelopePreloadProps) {
  if (!config) {
    return null;
  }

  // 处理所有需要预加载的图片资源
  const imagesToPreload = [
    config.backgroundImage
      ? cdnApi(config.backgroundImage, { format: 'webp' })
      : null,
    config.innerTexture
      ? cdnApi(config.innerTexture, { format: 'webp' })
      : null,
    config.outerTexture
      ? cdnApi(config.outerTexture, { format: 'webp' })
      : null,
    config.envelopeSealImage
      ? cdnApi(config.envelopeSealImage, { format: 'webp' })
      : null,
    '/assets/envelope/open-geust.svg',
  ].filter(Boolean) as string[];

  return (
    <>
      {imagesToPreload.map(src => (
        <link
          key={src}
          rel='preload'
          href={src}
          as='image'
          fetchPriority='high'
        />
      ))}
    </>
  );
}
