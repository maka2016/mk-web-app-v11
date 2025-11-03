import { deepClone } from '@mk/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { GridRow, GridState, scrollToActiveRow } from '../../../shared';
import { BtnLiteColumn } from '../../../shared/style-comps';
import MaterialComponents, {
  ComponentResourceDataType,
} from '../../ThemeLayoutLibraryV3/MaterialComponents';

export function ChangeComponentTriggerPop() {
  const { getActiveRow, addRowFromTemplateV2 } = useGridContext();
  const [isChangeComponentOpen, setIsChangeComponentOpen] = useState(false);
  const currRow = getActiveRow();
  if (!currRow) {
    return null;
  }
  if (!currRow.componentGroupRefId) {
    return null;
  }

  return (
    <Popover
      open={isChangeComponentOpen}
      onOpenChange={setIsChangeComponentOpen}
    >
      <PopoverTrigger asChild>
        <BtnLiteColumn
          onClick={e => {
            setIsChangeComponentOpen(true);
          }}
        >
          <LayoutDashboard size={20} />
          换版式
        </BtnLiteColumn>
      </PopoverTrigger>
      <PopoverContent
        className='w-[300px] min-w-[148px] p-2'
        side='bottom'
        align='start'
      >
        <MaterialComponents
          manager={false}
          activeComponentGroupId={currRow.componentGroupRefId}
          onComponentClick={c => {
            // console.log('c', c);
            // return;
            const component = deepClone(c);
            toast.dismiss();
            try {
              if (currRow.sourceComponentId === component.compId) {
                toast('当前组件已经是该组件变体');
                return;
              }
              component.data.rows[0].componentGroupRefId =
                currRow.componentGroupRefId;
              component.data.rows[0]._id = currRow.id;
              addRowFromTemplateV2(component.data, undefined, true);
              toast.success(`已切换到: ${component.compName || '未命名'}`);
            } catch (error) {
              console.error('切换组件失败', error);
              toast.error('切换失败');
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ChangeComponentTriggerDialog({
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
  const {
    widgetStateV2: widgetStateV2FromContext,
    getActiveRow,
    setWidgetStateV2,
    addRowFromTemplateV2,
    getRowByDepth,
  } = useGridContext();
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
    if (clickToActiveRow) {
      scrollToActiveRow(currRow.id, true, 100);
    }
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
