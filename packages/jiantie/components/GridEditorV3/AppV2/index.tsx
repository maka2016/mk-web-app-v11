import { Toaster } from 'react-hot-toast';
import { SerializedWorksEntity } from '../../../utils';
import DesignerToolForEditor from '../componentsForEditor';
import { HeaderType } from '../componentsForEditor/HeaderV2/HeaderForUser';
import { WorksStoreProvider } from '../provider';
import { IWorksData } from '../works-store/types';
import GridCompV2 from './GridCompV2';
import './index.scss';
import './lib/animate.css';

interface GridCompWrapperProps {
  worksId: string;
  readonly: boolean;
  headerType?: HeaderType;
  worksData?: IWorksData;
  worksDetail?: SerializedWorksEntity;
}

const GridCompWrapper = (props: GridCompWrapperProps) => {
  return (
    <WorksStoreProvider
      worksId={props.worksId}
      readonly={props.readonly}
      worksData={props.worksData}
      worksDetail={props.worksDetail}
    >
      <DesignerToolForEditor headerType={props.headerType}>
        <GridCompV2 />
      </DesignerToolForEditor>
      <Toaster containerStyle={{ top: 56, bottom: 88, zIndex: 99999 }} />
    </WorksStoreProvider>
  );
};

export default GridCompWrapper;
