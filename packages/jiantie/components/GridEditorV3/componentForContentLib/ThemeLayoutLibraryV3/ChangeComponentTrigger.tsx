import { deepClone } from '@/utils';
import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { LayoutDashboard } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BtnLite } from '../../components/style-comps';
import { useWorksStore } from '../../works-store/store/hook';
import MaterialComponents from './MaterialComponents';

const BtnLite2 = styled(BtnLite)`
  background-color: transparent;
  padding: 8px;
`;

function ChangeBlockTrigger() {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { getActiveRow, addRowFromTemplateV2 } = worksStore.gridPropsOperator;
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

export default observer(ChangeBlockTrigger);

export function ChangeRowTrigger({
  triggerLabel = '换组件',
}: {
  triggerLabel?: string;
}) {
  const worksStore = useWorksStore();
  const { getActiveRow, addRowFromTemplateV2 } = worksStore.gridPropsOperator;
  const currRow = getActiveRow();
  const [showList, setShowList] = useState(false);
  if (!currRow) {
    return null;
  }
  return (
    <Popover open={showList} onOpenChange={setShowList}>
      <PopoverTrigger asChild>
        <BtnLite2 onClick={e => { }}>
          <LayoutDashboard size={20} />
          {triggerLabel}
        </BtnLite2>
      </PopoverTrigger>
      <PopoverContent
        className='w-[300px] min-w-[148px] p-2 max-h-[300px] overflow-y-auto'
        side='bottom'
        align='start'
      >
        <MaterialComponents
          manager={false}
          activeComponentGroupId={currRow.componentGroupRefId}
          onComponentClick={c => {
            console.log('c', c);
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

              // 使用当前的style
              component.data.rows[0].style = currRow.style;
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
