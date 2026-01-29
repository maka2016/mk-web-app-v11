import { cn } from '@workspace/ui/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { MaterialGroup, MaterialResourceItem } from '../../types';

interface MaterialManagerSelectorProps {
  materialGroup?: MaterialGroup<MaterialResourceItem>[];
  onChange: (material: MaterialResourceItem) => void;
  renderItem?: (
    item: MaterialResourceItem,
    onClick: () => void
  ) => React.ReactNode;
  gridLayout?: boolean;
  emptyText?: string;
  columns?: number; // 网格布局的列数，默认为3
  prependItemInGrid?: React.ReactNode; // 在第一个分组的网格第一个位置插入的自定义项
}

// 单个分组选择器
function GroupSelector({
  group,
  onChange,
  renderItem,
  gridLayout,
  columns = 3,
  prependItemInGrid,
}: {
  group: MaterialGroup<MaterialResourceItem>;
  onChange: (item: MaterialResourceItem) => void;
  renderItem?: MaterialManagerSelectorProps['renderItem'];
  gridLayout: boolean;
  columns?: number;
  prependItemInGrid?: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 默认渲染函数
  const defaultRenderItem = (
    item: MaterialResourceItem,
    onClick: () => void
  ) => {
    if (item.type === 'pic') {
      return (
        <div className='group relative cursor-pointer' onClick={onClick}>
          <div className='relative aspect-square rounded border overflow-hidden bg-gray-100 hover:shadow-sm transition-shadow'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.content}
              alt={item.name || item.tag}
              className='w-full h-full object-cover'
              loading='lazy'
            />
          </div>
          <div className='mt-1'>
            <div className='text-xs text-gray-900 truncate text-center'>
              {item.name || '未命名'}
            </div>
          </div>
        </div>
      );
    }

    // 文字类型
    return (
      <div
        className='p-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0'
        onClick={onClick}
      >
        <div className='text-sm text-gray-900 line-clamp-2 break-words'>
          {item.content}
        </div>
        {item.name && (
          <div className='text-xs text-gray-500 mt-1 truncate'>{item.name}</div>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-col border border-gray-200 m-2 rounded-md'>
      {/* 分组标题栏 */}
      <div
        className={cn(
          'p-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors',
          !isExpanded && 'border-b-0'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <div className='text-sm font-medium text-gray-800'>{group.name}</div>
          <div className='text-xs text-gray-500'>({group.items.length})</div>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className='text-gray-500' />
        ) : (
          <ChevronDown size={16} className='text-gray-500' />
        )}
      </div>

      {/* 分组内容区 */}
      {isExpanded && (
        <div className='p-2'>
          {group.items.length === 0 ? (
            <div className='p-8 text-center text-sm text-gray-400'>
              暂无素材
            </div>
          ) : gridLayout ? (
            // 网格布局
            <div
              className='grid gap-2'
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {prependItemInGrid && <div>{prependItemInGrid}</div>}
              {group.items.map((item, index) => (
                <div key={`${group.id}-${index}`}>
                  {renderItem
                    ? renderItem(item, () => onChange(item))
                    : defaultRenderItem(item, () => onChange(item))}
                </div>
              ))}
            </div>
          ) : (
            // 列表布局
            <div className='flex flex-col'>
              {group.items.map((item, index) => (
                <div key={`${group.id}-${index}`}>
                  {renderItem
                    ? renderItem(item, () => onChange(item))
                    : defaultRenderItem(item, () => onChange(item))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 主组件
export default function MaterialManagerSelector({
  materialGroup,
  onChange,
  renderItem,
  gridLayout = true,
  emptyText = '暂无素材',
  columns = 3,
  prependItemInGrid,
}: MaterialManagerSelectorProps) {
  return (
    <div className='h-full flex flex-col bg-white overflow-y-auto max-h-[70vh]'>
      {!materialGroup || materialGroup?.length === 0 ? (
        <div className='flex flex-col items-center justify-center h-full text-gray-400'>
          <p className='text-sm p-8'>{emptyText}</p>
        </div>
      ) : (
        materialGroup.map((group, index) => {
          if (!group) return null;
          return (
            <GroupSelector
              key={group.id}
              group={group}
              onChange={onChange}
              renderItem={renderItem}
              gridLayout={gridLayout}
              columns={columns}
              prependItemInGrid={index === 0 ? prependItemInGrid : undefined}
            />
          );
        })
      )}
    </div>
  );
}
