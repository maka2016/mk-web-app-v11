import { stringValueTo4Chunk } from './utils';

/**
 * 计算指示器相对于画布容器的位置
 * @param targetDOM 目标DOM元素
 * @param indicatorRef 指示器DOM引用
 * @param isChildElement 指示器是否为目标元素的子元素
 */
export const calculateIndicatorPosition = (
  targetDOM: HTMLElement,
  indicatorRef: HTMLElement,
  isChildElement: boolean = false
) => {
  // 获取目标元素的边界矩形
  const targetRect = targetDOM.getBoundingClientRect();
  // 计算iOS的视口偏移量
  const viewportOffsetTop = window.visualViewport?.offsetTop || 0;

  if (isChildElement) {
    // 如果指示器是目标元素的子元素，则位置应该是相对于目标元素的
    // 这种情况下，指示器应该覆盖整个父元素
    indicatorRef.style.top = '0px';
    indicatorRef.style.left = '0px';
    indicatorRef.style.width = '100%';
    indicatorRef.style.height = '100%';
  } else {
    // 如果指示器是独立元素，需要相对于画布容器定位
    const designerCanvasScrollContainer = document.querySelector(
      '#designer_scroll_container'
    ) as HTMLElement;
    const designerCanvasContainer = document.querySelector(
      '#designer_canvas_container'
    ) as HTMLElement;
    const headerContainer = document.querySelector(
      '#editor_header'
    ) as HTMLElement;
    const designerCanvasContainerRect =
      designerCanvasContainer.getBoundingClientRect();

    const headerHeight = headerContainer?.getBoundingClientRect().height || 0;
    // 获取设计器画布容器的滚动偏移
    const scrollTop = designerCanvasScrollContainer?.scrollTop || 0;
    const scrollLeft = designerCanvasScrollContainer?.scrollLeft || 0;

    const paddingTop =
      stringValueTo4Chunk(
        getComputedStyle(designerCanvasScrollContainer).padding
      )?.[0] || 0;

    indicatorRef.style.top = `${targetRect.top + scrollTop - headerHeight + viewportOffsetTop - paddingTop}px`;
    indicatorRef.style.left = `${targetRect.left - designerCanvasContainerRect.left - scrollLeft}px`;
    indicatorRef.style.width = `${targetRect.width}px`;
    indicatorRef.style.height = `${targetRect.height}px`;
  }
};
