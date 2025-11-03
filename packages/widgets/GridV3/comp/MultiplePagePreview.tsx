import { getPermissionData, getWorksDetailStatic } from '@mk/services';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { GridProps, GridState } from '../shared';
import { GridCompV2 } from './GridCompV2';
import GridProvider from './provider';

export default function MultiplePagePreview(
  props: PlatformCompProps<GridProps, GridState>
) {
  const { editorSDK, controledValues, editorCtx, viewerSDK, id, getWorksData } =
    props;
  const worksDetail = getWorksDetailStatic();
  const fullStack = getPermissionData().materialProduct;

  return (
    <GridProvider
      fullStack={fullStack}
      worksDetail={worksDetail}
      editorSDK={editorSDK}
      editorCtx={editorCtx}
      viewerSDK={viewerSDK}
      gridProps={controledValues}
      gridId={id}
      useGridV2={true}
      getWorksData={getWorksData}
    >
      <div className='content'>
        <GridCompV2
          {...props}
          key={`grid_root_container_${controledValues._updateVersion}`}
        />
      </div>
      <div className='footer'></div>
    </GridProvider>
  );
}
