import { getWorksDetailStatic } from '@mk/services';
import React, { useEffect, useState } from 'react';
import GuidelinesForFlipPage from './GuidelinesForFlipPage';
import { useGridContext } from '../../../comp/provider';
import GuidelinesForFlatPage from './GuidelinesForFlatPage';

const Guidelines = ({}) => {
  const { widgetStateV2 } = useGridContext();
  const worksDetail = getWorksDetailStatic();
  const isFlipPage = worksDetail?.specInfo?.is_flip_page;
  const { showMobilePreviewLine = true } = widgetStateV2;
  if (!showMobilePreviewLine) {
    return null;
  }
  if (isFlipPage) {
    return <GuidelinesForFlipPage />;
  } else {
    return <GuidelinesForFlatPage />;
  }
};

export default Guidelines;
