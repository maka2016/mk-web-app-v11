import { cdnApi } from '@/services';
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
    config.backgroundImage ? cdnApi(config.backgroundImage) : null,
    config.innerTexture ? cdnApi(config.innerTexture) : null,
    config.leftFlapOuterImage ? cdnApi(config.leftFlapOuterImage) : null,
    config.rightFlapOuterImage ? cdnApi(config.rightFlapOuterImage) : null,
    config.envelopeSealImage ? cdnApi(config.envelopeSealImage) : null,
    '/assets/envelope/inner.svg',
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
