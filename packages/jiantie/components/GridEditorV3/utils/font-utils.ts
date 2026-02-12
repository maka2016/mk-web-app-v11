/**
 * 字体工具函数
 *
 * 用于计算裁剪字体的 fontId 和 URL，供 SSR 预加载和客户端渲染使用。
 */
import md5 from 'blueimp-md5';

/**
 * 计算裁剪字体的 fontId 和 URL
 *
 * @param text - 文字内容（可能包含 HTML 标签）
 * @param fontFamily - 原始字体名称
 * @returns fontId 和对应的裁剪字体 URL
 */
export function computeCroppedFontId(
  text: string,
  fontFamily: string
): { fontId: string; url: string } {
  // 与后端逻辑保持一致：去除 HTML 标签，替换 &nbsp;，添加全角空格
  const plainText =
    text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') + '　';

  const fontId = md5(plainText + fontFamily);
  const url = `https://font.maka.im/maka_font/mk_editor_v7/${fontId}.ttf`;

  return { fontId, url };
}

/**
 * 解析字体别名，返回实际用于 @font-face 的 fontFamily 和 fontUrl。
 * 与 TextComp 内 getFontFamily 逻辑一致，供 SSR 预加载与客户端共用。
 */
export function getResolvedFontAttrs(fontFamily: string, fontUrl: string): { fontFamily: string; fontUrl: string } {
  const fontFamilyMap: Record<string, { fontFamily: string; fontUrl: string }> = {
    F_si_yuan_song_ti__Regular: {
      fontFamily: 'SourceHanSerifCN-Regular',
      fontUrl: 'https://font.maka.im/20200402/SourceHanSerifCN-Regular.ttf?v=1',
    },
    F_si_yuan_song_ti__Medium: {
      fontFamily: 'SourceHanSerifCN-Medium',
      fontUrl: 'https://font.maka.im/20190724/SourceHanSerifCN-Medium.ttf',
    },
    F_si_yuan_song_ti__Heavy: {
      fontFamily: 'SourceHanSerifCN-Heavy',
      fontUrl: 'https://font.maka.im/20190724/SourceHanSerifCN-Heavy.ttf',
    },
    F_si_yuan_song_ti__Bold: {
      fontFamily: 'SourceHanSerifCN-Bold',
      fontUrl: 'https://font.maka.im/20200402/SourceHanSerifCN-Bold.ttf?v=1',
    },
  };
  const result = fontFamilyMap[fontFamily];
  if (result) return result;
  return { fontFamily, fontUrl };
}

/**
 * 检查是否应该使用全量字体
 *
 * @param inEditor - 是否在编辑器中
 * @param exportFormat - 导出格式
 * @returns 是否使用全量字体
 */
export function shouldLoadFullFont(
  inEditor: boolean,
  exportFormat: string | undefined
): boolean {
  // 编辑器中使用全量字体
  if (inEditor) return true;
  // 非 HTML 导出格式使用全量字体
  if (!/html/i.test(exportFormat || '')) return true;
  return false;
}
