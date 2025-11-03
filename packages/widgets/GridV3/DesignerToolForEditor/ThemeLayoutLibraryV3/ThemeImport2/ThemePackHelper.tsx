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
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { getCopyRowCodeWithGroupPure } from '../../../comp/provider/operatorV2';
import ThemePackPages from './ThemePackPages';

/**
 * 主题包助手，用于模版制作时使用已关联的主题包
 */
export default function ThemePackHelper({
  needSyncAllCards = false,
}: {
  needSyncAllCards?: boolean;
}) {
  const {
    gridProps,
    gridsData,
    addRowFromTemplateV2,
    editorSDK,
    themePackV3Data,
  } = useGridContext();
  const { themePackGridProps, worksData, themePackWorksRes, allLayers } =
    themePackV3Data;

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
        getLink: (id: string) => {
          return worksData.positionLink[id];
        },
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
    editorSDK?.onFormValueChange({
      themeConfig2: themePackGridProps.themeConfig2,
    });
    toast.success('同步成功');
  };

  return (
    <>
      {needSyncAllCards && (
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
      )}
      <ThemePackPages
        gridsData={themePackGridProps.gridsData}
        worksData={getWorksData()}
        usedRowIds={collectSourceRowIds().map(r => r.sourceRowId)}
      />
    </>
  );
}
