import { queryToObj } from '@/utils';
import { useEffect, useRef, useState } from 'react';
import FlipWrapper, { FlipWrapperRef } from './FlipWrapper';
import LongPageRowEditorV2, {
  LongPageRowEditorV2Props,
} from './LongPageRowEditorV2';

interface FlipPageRowRenderProps extends LongPageRowEditorV2Props {
  isPlayFlipPage?: boolean;
  isFlipPage?: boolean;
}

export default function RowRender(props: FlipPageRowRenderProps) {
  const { readonly, isPlayFlipPage, isFlipPage, firstPageCover } = props;
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
    window.addEventListener('next_page', event => {
      flipWrapperRef.current?.nextPage();
    });
  }, [isPlayFlipPage, firstPageCover, disabledAutoPlay]);

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
