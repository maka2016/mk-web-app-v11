/**
 * 第一页字体预加载 - 仅在 viewer 预览模式下在 SSR 阶段输出 preload 标签，
 * 使 document.fonts.ready 能正确等待首屏字体加载完成。
 */
import type { IWorksData } from '@/components/GridEditorV3/works-store/types';
import type { SerializedWorksEntity } from '@/utils';
import { collectFirstPageFontUrls } from './firstPageFonts';

interface FirstPageFontPreloadProps {
  worksData: IWorksData;
  viewMode?: 'viewer' | 'preview' | 'store';
  worksDetail: SerializedWorksEntity;
}

export function FirstPageFontPreload({
  worksData,
}: FirstPageFontPreloadProps) {

  const urls = collectFirstPageFontUrls(worksData,);

  // console.log('urls', urls);
  if (urls.length === 0) {
    return null;
  }

  return (
    <>
      {urls.map(url => (
        <link
          key={url}
          rel="preload"
          href={url}
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
}
