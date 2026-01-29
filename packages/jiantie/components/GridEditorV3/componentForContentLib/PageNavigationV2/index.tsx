import { observer } from 'mobx-react';
import { useWorksStore } from '../../works-store/store/hook';
import ThemePackHelper from '../ThemeImport/ThemePackHelper';

interface Props {
  onClose: () => void;
  onChange: () => void;
}

const PageNavigationV2 = (props: Props) => {
  const worksStore = useWorksStore();
  const gridProps = worksStore.worksData.gridProps;
  const v3ThemePackId = gridProps.themePackV3RefId?.worksId;
  if (v3ThemePackId) {
    return (
      <div className='h-full relative overflow-hidden flex flex-col select-none'>
        <ThemePackHelper />
      </div>
    );
  }
  return null;
};

export default observer(PageNavigationV2);
