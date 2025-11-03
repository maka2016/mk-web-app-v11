import { queryToObj } from '@mk/utils';
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
  const { readonly, isPlayFlipPage, isFlipPage } = props;
  const [screenshotRow] = useState(queryToObj().screenshot_block);
  const flipWrapperRef = useRef<FlipWrapperRef>(null);

  useEffect(() => {
    if (isPlayFlipPage && flipWrapperRef.current) {
      flipWrapperRef.current?.startAutoPlay();
    } else {
      flipWrapperRef.current?.stopAutoPlay();
    }
  }, [isPlayFlipPage]);

  const renderPages = () => {
    return LongPageRowEditorV2(props);
  };

  if (!isFlipPage || !readonly || screenshotRow) {
    return renderPages();
  }

  return <FlipWrapper ref={flipWrapperRef}>{renderPages()}</FlipWrapper>;
}
