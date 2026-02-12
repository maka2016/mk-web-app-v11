import { IconInput } from '@workspace/ui/components/icon-input';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useWorksStore } from '../../works-store/store/hook';

const AbsolutePositionSetting = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2 } = worksStore;
  const { editingElemId } = widgetStateV2;

  if (!editingElemId) return null;

  const layer = worksStore.getLayer(editingElemId);
  if (!layer) return null;

  const positionSetting = layer.attrs.position;
  if (!positionSetting) return null;

  const { top, bottom, constraint } = positionSetting;

  return (
    <div className='flex flex-col gap-2'>
      <div className='text-xs text-gray-500'>自由元素</div>
      <div className='grid grid-cols-2 gap-2'>
        {constraint === 'left-top' ? (
          <IconInput
            icon2={<span className='text-xs'>Top</span>}
            type='number'
            placeholder='0'
            value={positionSetting?.top}
            onChange={e => {
              const val = e.target.value;
              const newTop = val ? parseInt(val, 10) : 0;
              worksStore.changeCompAttr(editingElemId, {
                position: {
                  ...positionSetting,
                  top: newTop,
                  bottom: undefined,
                },
              });
            }}
          />
        ) : (
          <IconInput
            icon2={<span className='text-xs'>Bot</span>}
            type='number'
            placeholder='0'
            value={positionSetting?.bottom}
            onChange={e => {
              const val = e.target.value;
              const newVal = val ? parseInt(val, 10) : 0;
              worksStore.changeCompAttr(editingElemId, {
                position: {
                  ...positionSetting,
                  bottom: newVal,
                  top: undefined,
                },
              });
            }}
          />
        )}

        <IconInput
          icon2={<span className='text-xs'>Left</span>}
          type='number'
          placeholder='0'
          value={positionSetting?.left}
          onChange={e => {
            const val = e.target.value;
            const newLeft = val ? parseInt(val, 10) : 0;
            worksStore.changeCompAttr(editingElemId, {
              position: {
                ...positionSetting,
                left: newLeft,
              },
            });
          }}
        />
      </div>
      <div className='flex gap-2 text-xs'>
        <div
          className={cn(
            'cursor-pointer',
            constraint === 'left-top' && 'text-blue-500'
          )}
          onClick={() => {
            worksStore.changeCompAttr(editingElemId, {
              position: {
                ...positionSetting,
                bottom: undefined,
                top: top ?? 0,
                constraint: 'left-top',
              },
            });
          }}
        >
          上对齐
        </div>
        <div
          className={cn(
            'cursor-pointer',
            constraint === 'left-bottom' && 'text-blue-500'
          )}
          onClick={() => {
            worksStore.changeCompAttr(editingElemId, {
              position: {
                ...positionSetting,
                top: undefined,
                bottom: bottom ?? 0,
                constraint: 'left-bottom',
              },
            });
          }}
        >
          下对齐
        </div>
        <div
          className={cn(
            'cursor-pointer',
            (!positionSetting?.relativeTo ||
              positionSetting?.relativeTo === 'block') &&
              'text-blue-500'
          )}
          onClick={() => {
            worksStore.changeCompAttr(editingElemId, {
              position: {
                ...positionSetting,
                relativeTo: 'block',
              },
            });
          }}
        >
          对齐Block
        </div>
        <div
          className={cn(
            'cursor-pointer',
            positionSetting?.relativeTo === 'parent' && 'text-blue-500'
          )}
          onClick={() => {
            worksStore.changeCompAttr(editingElemId, {
              position: {
                ...positionSetting,
                relativeTo: 'parent',
              },
            });
          }}
        >
          对齐父级
        </div>
      </div>
    </div>
  );
};

export default observer(AbsolutePositionSetting);
