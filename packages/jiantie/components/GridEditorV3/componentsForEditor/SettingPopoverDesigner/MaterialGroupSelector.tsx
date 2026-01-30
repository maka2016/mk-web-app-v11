import { cn } from '@workspace/ui/lib/utils';
import { MaterialGroup, MaterialResourceItem } from '../../types';

export default function MaterialGroupSelector({
  materialGroup,
  activeGroupId,
  onSelect,
}: {
  materialGroup?: MaterialGroup<MaterialResourceItem>[];
  activeGroupId?: string;
  onSelect?: (group: MaterialGroup<MaterialResourceItem>) => void;
}) {
  if (!materialGroup) return null;
  return (
    <div className='flex flex-col gap-1'>
      {materialGroup.map(group => (
        <div
          key={group.id}
          onClick={() => onSelect?.(group)}
          className={cn(
            'cursor-pointer hover:bg-gray-100 py-1 px-2 rounded-md text-sm',
            {
              'bg-blue-500 text-white hover:bg-blue-600':
                activeGroupId === group.id,
            }
          )}
        >
          {group.name}
        </div>
      ))}
    </div>
  );
}
