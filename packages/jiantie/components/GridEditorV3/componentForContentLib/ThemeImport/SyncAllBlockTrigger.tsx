import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { observer } from 'mobx-react';
import toast from 'react-hot-toast';
import { getCopyRowCodeWithGroupPure } from '../../provider/gridPropsOperator';
import { useWorksStore } from '../../works-store/store/hook';

function SyncAllBlockTrigger() {
  const worksStore = useWorksStore();
  const gridProps = worksStore.worksData.gridProps;
  const gridsData = gridProps.gridsData;
  const { addRowFromTemplateV2 } = worksStore.gridPropsOperator;
  const { themePackV3Operator } = worksStore;
  const { themePackGridProps, worksData, themePackWorksRes, allLayers } =
    themePackV3Operator;

  if (!gridProps.themePackV3RefId?.worksId) {
    return <div className='p-2'>未绑定主题包</div>;
  }

  if (!themePackWorksRes?.detail || !themePackGridProps) {
    return <div className='p-2'>loading..</div>;
  }

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

  const handleSyncAllCards = () => {
    if (!worksData) {
      toast.error('初始化失败，请刷新重试');
      return;
    }
    collectSourceRowIds().forEach(item => {
      const copyRowCode = getCopyRowCodeWithGroupPure({
        activeRowDepth: [
          themePackGridProps.gridsData.findIndex(
            r => r.id === item.sourceRowId
          ),
        ],
        gridsData: themePackGridProps.gridsData,
        getLayer: (id: string) => allLayers[id],
      });
      if (copyRowCode) {
        addRowFromTemplateV2(
          copyRowCode,
          {
            activeRowDepth: item.rowDepth,
          },
          true
        );
        // deleteRowBatchV2([item.rowId]);
      }
    });
    worksStore.setGridProps({
      themeConfig2: themePackGridProps.themeConfig2,
    });
    toast.success('同步成功');
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size={'sm'}
          variant={'outline'}
          className='ml-2'
          onClick={e => {
            // setShowList(true);
          }}
        >
          同步所有卡片
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='w-[320px]'>
        <AlertDialogHeader>
          <AlertDialogTitle>
            一旦同步，已有卡片将被替换到最新状态，请确认后操作
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleSyncAllCards();
            }}
          >
            确认同步
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export default observer(SyncAllBlockTrigger);
