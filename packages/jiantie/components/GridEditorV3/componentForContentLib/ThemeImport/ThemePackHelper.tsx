import { observer } from 'mobx-react';
import { useWorksStore } from '../../works-store/store/hook';
import SyncAllBlockTrigger from './SyncAllBlockTrigger';
import ThemePackPages from './ThemePackPages';

/**
 * 主题包助手，用于模版制作时使用已关联的主题包
 */
function ThemePackHelper({
  needSyncAllCards = false,
}: {
  needSyncAllCards?: boolean;
}) {
  const worksStore = useWorksStore();
  const gridProps = worksStore.worksData.gridProps;
  const gridsData = gridProps.gridsData;
  const { themePackV3Operator } = worksStore;
  const { themePackGridProps, themePackWorksRes } = themePackV3Operator;

  if (!gridProps.themePackV3RefId?.worksId) {
    return <div className='p-2'>未绑定主题包</div>;
  }

  if (!themePackWorksRes?.detail || !themePackGridProps) {
    return <div className='p-2'>loading..</div>;
  }

  const getWorksData = () => {
    return themePackWorksRes?.work_data || ({} as any);
  };

  const collectSourceRowIds = () => {
    const replaceTarget: {
      rowId: string;
      rowDepth: number[];
      sourceRowId: string;
    }[] = [];
    gridsData.forEach((row, rowIdx) => {
      if (row.sourceRowId) {
        replaceTarget.push({
          rowId: row.id,
          rowDepth: [rowIdx],
          sourceRowId: row.sourceRowId,
        });
      }
    });
    return replaceTarget;
  };

  return (
    <>
      {needSyncAllCards && <SyncAllBlockTrigger />}
      <ThemePackPages
        gridsData={themePackGridProps.gridsData}
        worksData={getWorksData()}
        usedRowIds={collectSourceRowIds().map(r => r.sourceRowId)}
      />
    </>
  );
}
export default observer(ThemePackHelper);
