import { getPermissionData, getWorksDetailStatic } from '@mk/services';
import { queryToObj } from '@mk/utils';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import ReactDOM from 'react-dom';
import { Toaster } from 'react-hot-toast';
import DesignerToolForEditor from '../DesignerToolForEditor';
import { GridProps, GridState } from '../shared';
import { GridCompV1 } from './GridCompV1';
import { GridCompV2 } from './GridCompV2';
import './index.scss';
import './lib/animate.css';
import GridProvider from './provider';
// import { Toaster as SonnerToaster } from "@workspace/ui/components/sonner";

const GridCompWrapper = (props: PlatformCompProps<GridProps, GridState>) => {
  const {
    editorSDK,
    widgetState,
    controledValues,
    editorCtx,
    viewerSDK,
    id,
    getWorksData,
  } = props;
  const isUseGridV2 =
    queryToObj().gridv2 === 'true' || controledValues.version === 'v2.1';
  const worksDetail = getWorksDetailStatic();
  const fullStack = getPermissionData().materialProduct;

  return (
    <GridProvider
      fullStack={fullStack}
      worksDetail={worksDetail}
      editorSDK={editorSDK}
      editorCtx={editorCtx}
      viewerSDK={viewerSDK}
      widgetState={widgetState}
      gridProps={controledValues}
      gridId={id}
      useGridV2={isUseGridV2}
      getWorksData={getWorksData}
    >
      <DesignerToolForEditor useGridV2={isUseGridV2}>
        {isUseGridV2 ? (
          <GridCompV2
            {...props}
            key={`grid_root_container_${controledValues._updateVersion}`}
          />
        ) : (
          <GridCompV1
            {...props}
            key={`grid_root_container_${controledValues._updateVersion}`}
          />
        )}
      </DesignerToolForEditor>
      {ReactDOM.createPortal(
        <>
          <Toaster containerStyle={{ top: 56, bottom: 88, zIndex: 99999 }} />
          {/* 暂时不用 */}
          {/* <SonnerToaster /> */}
        </>,
        document.body
      )}
    </GridProvider>
  );
};

export default GridCompWrapper;
