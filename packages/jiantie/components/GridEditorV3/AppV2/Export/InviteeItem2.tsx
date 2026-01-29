'use client';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Input } from '@workspace/ui/components/input';

interface Invitee {
  id: string;
  name: string;
  phone?: string | null;
}

interface InviteeItemProps {
  // 通用模版或嘉宾数据
  invitee: Invitee | null;
  // 序号（通用模版为0，嘉宾从1开始）
  index: number;
  // 是否激活状态
  isActive: boolean;
  // 是否选中状态（批量模式）
  isSelected: boolean;
  // 是否被点击选中（非批量模式）
  isFocused: boolean;
  // 是否编辑状态
  isEditing: boolean;
  // 是否批量模式
  isBatchMode: boolean;
  // 编辑相关
  editingName?: string;
  updatingInvitee?: boolean;
  onEditingNameChange?: (name: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onStartEdit?: (e: React.MouseEvent) => void;
  // 选择相关
  onToggleSelection?: () => void;
  // 点击相关
  onClick?: () => void;
  // 操作相关
  onDownload?: (e: React.MouseEvent) => void;
  onPreview?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
  showDownloadButton?: boolean;
  showPreviewButton?: boolean;
}

export function InviteeItem({
  invitee,
  index,
  isActive,
  isSelected,
  isFocused,
  isEditing,
  isBatchMode,
  editingName = '',
  updatingInvitee = false,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onToggleSelection,
  onClick,
  onDownload,
  onPreview,
  showEditButton = false,
  showDownloadButton = false,
  showPreviewButton = false,
}: InviteeItemProps) {
  const isGeneralTemplate = invitee === null;
  const displayName = isGeneralTemplate
    ? '通用模版'
    : invitee.name || '未知嘉宾';
  const description = isGeneralTemplate ? '不显示具体名字' : undefined;
  const isHighlighted = isActive || isSelected || isEditing || isFocused;

  return (
    <div
      className={`flex items-center gap-3 p-3 min-h-[56px] rounded-lg transition-colors ${
        isHighlighted ? 'bg-blue-50' : 'bg-white'
      } ${!isEditing ? 'cursor-pointer' : ''}`}
      onClick={!isEditing ? onClick : undefined}
    >
      {/* 序号圆形图标 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isHighlighted ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`text-sm font-medium ${
            isHighlighted ? 'text-white' : 'text-gray-600'
          }`}
        >
          {index}
        </span>
      </div>

      {/* 批量模式下的checkbox */}
      {isBatchMode && (
        <div
          onClick={e => e.stopPropagation()}
          className='cursor-pointer flex items-center justify-center'
        >
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelection} />
        </div>
      )}

      {/* 名称或编辑输入框 */}
      <div className='flex-1 min-w-0'>
        {isEditing ? (
          <div className='flex items-center gap-2'>
            <Input
              className='flex-1 h-8 text-sm'
              value={editingName}
              onChange={e => onEditingNameChange?.(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter' && !updatingInvitee) {
                  onSaveEdit?.();
                } else if (e.key === 'Escape') {
                  onCancelEdit?.();
                }
              }}
              autoFocus
            />
            <Button
              size='sm'
              className='h-8 px-2 bg-gray-800 text-white'
              onClick={e => {
                e.stopPropagation();
                onSaveEdit?.();
              }}
              disabled={updatingInvitee || !editingName.trim()}
            >
              保存
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 px-2'
              onClick={e => {
                e.stopPropagation();
                onCancelEdit?.();
              }}
              disabled={updatingInvitee}
            >
              取消
            </Button>
          </div>
        ) : (
          <div>
            <div className='font-medium text-sm text-[#09090B]'>
              {displayName}
            </div>
            {description && (
              <div className='text-xs text-gray-500 mt-0.5'>{description}</div>
            )}
          </div>
        )}
      </div>

      {/* 操作图标 */}
      {!isEditing && (
        <div className='flex items-center gap-2 shrink-0'>
          {showEditButton && !isBatchMode && (
            <Button
              onClick={e => {
                e.stopPropagation();
                onStartEdit?.(e);
              }}
              variant={'outline'}
              className='text-xs h-8'
              size={'xs'}
              aria-label={`编辑${displayName}`}
            >
              编辑
            </Button>
          )}
          {showPreviewButton && onPreview && (
            <Button
              onClick={e => {
                e.stopPropagation();
                onPreview(e);
              }}
              variant={'outline'}
              className='text-xs h-8'
              size={'xs'}
              aria-label={`预览${displayName}的邀请函`}
            >
              查看
            </Button>
          )}
          {showDownloadButton && onDownload && (
            <Button
              onClick={e => {
                e.stopPropagation();
                onDownload(e);
              }}
              variant={'outline'}
              className='text-xs h-8'
              size={'xs'}
              aria-label={`下载${displayName}的邀请函`}
            >
              下载
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
