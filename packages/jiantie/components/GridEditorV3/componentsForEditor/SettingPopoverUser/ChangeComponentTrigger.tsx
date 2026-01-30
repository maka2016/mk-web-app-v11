import { deepClone } from '@/utils';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import MaterialComponents, {
  ComponentResourceDataType,
} from '../../componentForContentLib/ThemeLayoutLibraryV3/MaterialComponents';
import { GridRow, GridState, scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';

function ChangeComponentTriggerDialog({
  activeRow,
  dataType = 'components',
  replaceCurrentRow = true,
  clickToActiveRow = true,
  showAllComponent = false,
  dialogTitle = '切换版式',
  autoScroll = true,
  widgetStateV2: widgetStateV2FromProps,
  onChange,
  trigger,
}: {
  activeRow?: GridRow;
  widgetStateV2?: GridState;
  dataType?: ComponentResourceDataType;
  autoScroll?: boolean;
  trigger: (open: boolean, setOpen: (open: boolean) => void) => React.ReactNode;
  dialogTitle?: string;
  replaceCurrentRow?: boolean;
  clickToActiveRow?: boolean;
  showAllComponent?: boolean;
  onChange?: (addResult: any) => void;
}) {
  const worksStore = useWorksStore();
  const { widgetStateV2: widgetStateV2FromContext, setWidgetStateV2 } =
    worksStore;
  const { getActiveRow, addRowFromTemplateV2, getRowByDepth } =
    worksStore.gridPropsOperator;
  const widgetStateV2 = widgetStateV2FromProps || widgetStateV2FromContext;
  const [isChangeComponentOpen, setIsChangeComponentOpen] = useState(false);
  const currRow = activeRow || getActiveRow();
  if (!currRow) {
    return null;
  }
  if (!currRow.componentGroupRefId && !showAllComponent) {
    return null;
  }

  const setIsChangeComponentOpenForTrigger = (open: boolean) => {
    // 移除弹窗打开时的滚动逻辑，避免画布滚动
    // if (clickToActiveRow) {
    //   scrollToActiveRow(currRow.id, true, 100);
    // }
    setIsChangeComponentOpen(open);
  };

  return (
    <>
      {trigger(isChangeComponentOpen, setIsChangeComponentOpenForTrigger)}
      <ResponsiveDialog
        isOpen={isChangeComponentOpen}
        onOpenChange={nextVal => {
          setIsChangeComponentOpen(nextVal);
        }}
        showOverlay={!replaceCurrentRow}
        handleOnly={true}
        title={dialogTitle}
        contentProps={{
          className: 'h-[60vh]',
        }}
      >
        <MaterialComponents
          manager={false}
          showGroupNavigation={true}
          renderOnlyActiveGroup={true}
          // viewMode={replaceCurrentRow ? 'horizontal' : 'vertical'}
          dataType={dataType}
          showAllComponent={showAllComponent}
          activeComponentGroupId={currRow.componentGroupRefId}
          autoScroll={autoScroll}
          onComponentClick={c => {
            // console.log('c', c);
            // return;
            const component = deepClone(c);
            try {
              if (currRow.sourceComponentId === component.compId) {
                toast('当前组件已经是该组件变体');
                return;
              }
              component.data.rows[0].componentGroupRefId =
                currRow.componentGroupRefId;
              component.data.rows[0]._id = currRow.id;
              // component.data.rows[0].style = currRow.style;

              if (dataType === 'components') {
                const addResult = addRowFromTemplateV2(
                  component.data,
                  widgetStateV2,
                  replaceCurrentRow
                );
                if (!replaceCurrentRow) {
                  setWidgetStateV2({
                    activeRowDepth: addResult.copiedRowDepth,
                    editingElemId: undefined,
                  });
                  setTimeout(() => {
                    scrollToActiveRow(
                      getRowByDepth(addResult.copiedRowDepth || [])?.id || '',
                      true,
                      100
                    );
                  }, 100);
                  setIsChangeComponentOpen(false);
                }
                onChange?.(addResult);
                toast.success('切换板式成功')
              } else if (dataType === 'blocks') {
                const addResult = addRowFromTemplateV2(
                  component.data,
                  {
                    activeRowDepth: [widgetStateV2?.activeRowDepth?.[0] || 0],
                  },
                  replaceCurrentRow
                );
                if (!replaceCurrentRow) {
                  setWidgetStateV2({
                    activeRowDepth: addResult.copiedRowDepth,
                    editingElemId: undefined,
                  });
                  scrollToActiveRow(
                    getRowByDepth(addResult.copiedRowDepth || [])?.id || '',
                    true,
                    100
                  );
                }
                onChange?.(addResult);
                setIsChangeComponentOpen(false);
                toast.success('切换板式成功')
              }
            } catch (error) {
              console.error('切换组件失败', error);
              toast.error('操作失败');
            }
          }}
        />
      </ResponsiveDialog>
    </>
  );
}

export default observer(ChangeComponentTriggerDialog);
