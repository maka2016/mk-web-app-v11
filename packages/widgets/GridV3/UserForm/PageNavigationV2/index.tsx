import { useGridContext } from '../../comp/provider';
import ThemePackHelper from '../../DesignerToolForEditor/ThemeLayoutLibraryV3/ThemeImport/ThemePackHelper';
import styles from './index.module.scss';
import ThemePages from './themePages';

interface Props {
  onClose: () => void;
  onChange: () => void;
}

const PageNavigationV2 = (props: Props) => {
  const { gridProps } = useGridContext();
  const v3ThemePackId = gridProps.themePackV3RefId?.worksId;
  if (v3ThemePackId) {
    return (
      <div className={styles.pageNavigation}>
        <ThemePackHelper />
      </div>
    );
  }
  return (
    <div className={styles.pageNavigation}>
      <ThemePages onClose={props.onClose} />
    </div>
  );
};

export default PageNavigationV2;
