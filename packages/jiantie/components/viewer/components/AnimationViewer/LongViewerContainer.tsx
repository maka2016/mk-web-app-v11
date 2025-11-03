import { queryToObj } from '@mk/utils';
import { Pages } from '@mk/works-store/types';
import React, { useEffect, useState } from 'react';
import { AppContext } from '../../types';
import H5Viewer from './pageRender';

let loadedCount = 0;

interface LongH5ViewerContainerProps {
  worksData: any;
  onPageLoaded?: () => void;
  query: AppContext['query'];
}

const LongH5ViewerContainer = React.forwardRef(function LongH5ViewerContainer(
  props: LongH5ViewerContainerProps,
  ref
) {
  const { worksData, query, onPageLoaded } = props;

  const { uid, worksId, screenshot } = query;
  const isScreenshot = !!screenshot;

  const [showCopy, setShowCopy] = useState(true);
  const pages = worksData.canvasData.content.pages as Pages;

  useEffect(() => {
    const urlParams = queryToObj();
    if (urlParams.hasOwnProperty('template_preview')) {
      setShowCopy(false);
    }
  }, []);

  const allPageLoaded = () => {
    loadedCount += 1;
    if (loadedCount === pages.length) {
      console.log('long_h5_allPageLoaded');
      onPageLoaded?.();
      // emitLoaded(`LongH5_loaded and emit event`)
    }
    // playAnimationsInPage(+index)
  };

  const renderPagePreview = (index: number, key: string) => {
    return (
      <H5Viewer
        key={key}
        useAnimate={false}
        worksData={worksData}
        pageIndex={+index}
        isActivePage={true}
        isShowPage={true}
        onPageLoaded={allPageLoaded}
      />
    );
  };

  return pages.map((page, index) => {
    return renderPagePreview(index, page.id);
  });
});

export default LongH5ViewerContainer;
