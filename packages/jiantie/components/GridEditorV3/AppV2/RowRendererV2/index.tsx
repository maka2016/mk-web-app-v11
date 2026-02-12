import { queryToObj } from '@/utils';
import { useEffect, useRef, useState } from 'react';
import FlipWrapper, { FlipWrapperRef } from './FlipWrapper';
import LongPageRowEditorV2, {
  LongPageRowEditorV2Props,
} from './LongPageRowEditorV2';

interface FlipPageRowRenderProps extends LongPageRowEditorV2Props {
  isPlayFlipPage?: boolean;
  isFlipPage?: boolean;
  /** 预览区专用：监听该自定义事件并执行 nextPage()，与 next_page 分离避免冲突 */
  previewFlipEventKey?: string;
}

export default function RowRender(props: FlipPageRowRenderProps) {
  const { readonly, isPlayFlipPage, isFlipPage, firstPageCover, previewFlipEventKey } = props;
  const [screenshotRow] = useState(queryToObj().screenshot_block);
  const [disabledAutoPlay, setDisabledAutoPlay] = useState(
    queryToObj().disable_auto_play
  );
  const flipWrapperRef = useRef<FlipWrapperRef>(null);
  useEffect(() => {
    if (
      isPlayFlipPage &&
      flipWrapperRef.current &&
      !firstPageCover &&
      !disabledAutoPlay
    ) {
      flipWrapperRef.current?.startAutoPlay();
    } else {
      flipWrapperRef.current?.stopAutoPlay();
    }
    const onNextPage = () => {
      flipWrapperRef.current?.nextPage();
    };
    const onGoToPage = (e: Event) => {
      const pageIndex = (e as CustomEvent).detail?.pageIndex;
      if (typeof pageIndex === 'number') {
        flipWrapperRef.current?.goToPage(pageIndex);
      }
    };
    window.addEventListener('next_page', onNextPage);
    window.addEventListener('go_to_page', onGoToPage);
    return () => {
      window.removeEventListener('next_page', onNextPage);
      window.removeEventListener('go_to_page', onGoToPage);
    };
  }, [isPlayFlipPage, firstPageCover, disabledAutoPlay]);

  useEffect(() => {
    if (!previewFlipEventKey) return;
    const onPreviewFlip = () => {
      flipWrapperRef.current?.nextPageOrGoToFirst();
    };
    window.addEventListener(previewFlipEventKey, onPreviewFlip);
    return () => {
      window.removeEventListener(previewFlipEventKey, onPreviewFlip);
    };
  }, [previewFlipEventKey]);

  const renderPages = () => {
    return LongPageRowEditorV2(props);
  };

  if (readonly && firstPageCover) {
    const [firstPage, ...otherPages] = renderPages();
    const pagesRes = [
      firstPage,
      <div
        key='1'
        {...(otherPages[0] as any)?.props}
        className='w-screen h-screen overflow-auto'
      >
        {otherPages}
      </div>,
    ];
    return <FlipWrapper ref={flipWrapperRef}>{pagesRes}</FlipWrapper>;
  }

  if (!isFlipPage || !readonly || screenshotRow) {
    return renderPages();
  }

  return <FlipWrapper ref={flipWrapperRef}>{renderPages()}</FlipWrapper>;
}
