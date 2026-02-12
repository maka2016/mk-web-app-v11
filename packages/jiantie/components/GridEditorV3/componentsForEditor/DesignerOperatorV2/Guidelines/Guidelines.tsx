import { SerializedWorksEntity } from '@/utils';
import { useWorksStore } from '../../../works-store/store/hook';
import GuidelinesForFlatPage from './GuidelinesForFlatPage';
import GuidelinesForFlipPage from './GuidelinesForFlipPage';

const Guidelines = ({
  worksDetail,
}: {
  worksDetail: SerializedWorksEntity;
}) => {
  const { widgetStateV2 } = useWorksStore();
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
