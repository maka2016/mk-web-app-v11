import { getCanvaInfo2 } from '../provider/utils';

export const clearUndefinedKey = (style: React.CSSProperties = {}) => {
  const escapeKeys = ['zIndex'];
  Object.keys(style).forEach(key => {
    const val = style[key as keyof typeof style];
    // if (escapeKeys.includes(key)) {
    //   return;
    // }
    if (
      val === undefined ||
      val === null ||
      (!escapeKeys.includes(key) && +val === 0) ||
      val === ''
    ) {
      delete style[key as keyof typeof style];
    }
  });
  return style;
};

export const calcViewerHeight = () => {
  const { canvaScale } = getCanvaInfo2();
  let totalHeight = 0;
  const blockItems = document.querySelectorAll<HTMLDivElement>(
    '.Grid_container .editor_row_wrapper'
  );
  if (!blockItems) {
    console.log(
      'calcViewerHeightError',
      '找不到.Grid_container .editor_row_wrapper'
    );
    return 0;
  }
  Array.from(blockItems).forEach(item => {
    if (item) {
      // const height = item.clientHeight / canvaScale;
      const height = (item.getBoundingClientRect()?.height || 1) / canvaScale;
      // console.log("height", height);
      totalHeight += height;
    }
  });
  return totalHeight;
};
