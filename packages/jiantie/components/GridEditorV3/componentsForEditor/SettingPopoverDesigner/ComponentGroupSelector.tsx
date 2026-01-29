import { cn } from '@workspace/ui/lib/utils';
import { ComponentGroupData, ComponentGroupDataItem } from '../../types';

export default function ComponentGroupSelector({
  componentGroupData,
  activeGroupId,
  onSelect,
}: {
  componentGroupData?: ComponentGroupData;
  activeGroupId?: string;
  onSelect?: (group: ComponentGroupDataItem) => void;
}) {
  if (!componentGroupData) return null;
  return (
    <div className='flex flex-col gap-1'>
      {componentGroupData.map(group => (
        <div
          key={group.groupId}
          onClick={() => onSelect?.(group)}
          className={cn(
            'cursor-pointer hover:bg-gray-100 py-1 px-2 rounded-md text-sm',
            {
              'bg-blue-500 text-white hover:bg-blue-600':
                activeGroupId === group.groupId,
            }
          )}
        >
          {group.groupName}
        </div>
      ))}
    </div>
  );
}
