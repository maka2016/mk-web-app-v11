import React, { useEffect, useRef, useState } from 'react';
import { queryToObj } from '@mk/utils';
import FlipWrapper, { FlipWrapperRef } from './FlipWrapper';
import LongPageRowRender from './LongPageRowRender';
import { FlatPageRowRenderProps } from './LongPageRowRender';

interface FlipPageRowRenderProps extends FlatPageRowRenderProps {
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
    return LongPageRowRender(props);
  };

  if (!isFlipPage || !readonly || screenshotRow) {
    return renderPages();
  }

  return <FlipWrapper ref={flipWrapperRef}>{renderPages()}</FlipWrapper>;
}
