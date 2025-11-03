import styled from '@emotion/styled';
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
import { useGridContext } from '../../comp/provider';
import { BtnLite } from '../../shared/style-comps';
import MaterialComponents from './MaterialComponents';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

export function ChangeBlockTrigger() {
  const {
    widgetStateV2,
    setWidgetStateV2,
    getActiveRow,
    addRowFromTemplateV2,
  } = useGridContext();
  const currBlock = getActiveRow();
  const blockIdx = widgetStateV2.activeRowDepth?.[0] || 0;
  const [showList, setShowList] = useState(false);

  if (!currBlock) {
    return null;
  }

  return (
    <Popover open={showList} onOpenChange={setShowList}>
      <PopoverTrigger asChild>
        <BtnLite2
          onClick={e => {
            setWidgetStateV2({
              activeRowDepth: [blockIdx],
            });
          }}
        >
          <LayoutDashboard size={20} />
          换版式
        </BtnLite2>
      </PopoverTrigger>
      <PopoverContent
        className='w-[300px] min-w-[148px] p-2'
        side='bottom'
        align='start'
      >
        <MaterialComponents
          manager={false}
          itemAspectRatio='3/4'
          activeComponentGroupId={currBlock.componentGroupRefId}
          dataType='blocks'
          onComponentClick={c => {
            // console.log('c', c);
            // return;
            const component = deepClone(c);
            toast.dismiss();
            try {
              if (currBlock.sourceComponentId === component.compId) {
                toast('当前组件已经是该组件变体');
                return;
              }
              component.data.rows[0].componentGroupRefId =
                currBlock.componentGroupRefId;
              component.data.rows[0]._id = currBlock.id;
              addRowFromTemplateV2(component.data, undefined, true);
              toast.success(`已切换到: ${component.compName || '未命名'}`);
            } catch (error) {
              console.error('切换组件失败', error);
              toast.error('切换失败');
            }
            setShowList(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ChangeRowTrigger({
  triggerLabel = '换组件',
}: {
  triggerLabel?: string;
}) {
  const { getActiveRow, addRowFromTemplateV2 } = useGridContext();
  const currRow = getActiveRow();
  const [showList, setShowList] = useState(false);
  if (!currRow) {
    return null;
  }
  return (
    <Popover open={showList} onOpenChange={setShowList}>
      <PopoverTrigger asChild>
        <BtnLite2 onClick={e => {}}>
          <LayoutDashboard size={20} />
          {triggerLabel}
        </BtnLite2>
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
            setShowList(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
export function ChangeRowDialog({
  triggerLabel = '换组件',
}: {
  triggerLabel?: string;
}) {
  const { getActiveRow, addRowFromTemplateV2 } = useGridContext();
  const currRow = getActiveRow();
  const [showList, setShowList] = useState(false);
  if (!currRow) {
    return null;
  }
  return (
    <>
      <BtnLite2
        onClick={e => {
          setShowList(true);
        }}
      >
        <LayoutDashboard size={20} />
        {triggerLabel}
      </BtnLite2>
      <ResponsiveDialog
        isOpen={showList}
        onOpenChange={setShowList}
        contentProps={{
          className: 'h-[75vh]',
        }}
        title='切换组件'
      >
        <MaterialComponents
          manager={false}
          activeComponentGroupId={currRow.componentGroupRefId}
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
              addRowFromTemplateV2(component.data, undefined, true);
              toast.success(`已切换到: ${component.compName || '未命名'}`);
            } catch (error) {
              console.error('切换组件失败', error);
              toast.error('切换失败');
            }
            setShowList(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}
