'use client';
import { queryToObj } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { InviteeItem } from './InviteeItem2';

interface Invitee {
  id: string;
  name: string;
  phone?: string | null;
}

interface InviteeManagerProps {
  worksId: string;
  enableBatchMode?: boolean;
  onSelectionChange?: (invitees: Invitee[]) => void;
  onDownload?: (invitee: Invitee | null) => void;
  onPreview?: (invitee: Invitee | null) => void;
}

export function InviteeManager({
  worksId,
  enableBatchMode: externalBatchMode,
  onSelectionChange,
  onDownload,
  onPreview,
}: InviteeManagerProps) {
  const activeInviteeName = queryToObj().guest_name;
  // 嘉宾相关状态
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loadingInvitees, setLoadingInvitees] = useState(false);
  const [showAddInviteeDialog, setShowAddInviteeDialog] = useState(false);
  const [inviteeNames, setInviteeNames] = useState('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);
  const [singleInviteeName, setSingleInviteeName] = useState('');
  const [creatingSingleInvitee, setCreatingSingleInvitee] = useState(false);
  const [focusedInviteeId, setFocusedInviteeId] = useState<string | null>(null);
  const singleInviteeInputRef = useRef<HTMLInputElement | null>(null);

  // 编辑名字相关状态
  const [editingInviteeId, setEditingInviteeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [updatingInvitee, setUpdatingInvitee] = useState(false);

  // 批量选择相关状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingInvitees, setDeletingInvitees] = useState(false);

  // 使用外部控制的多选模式
  const isBatchMode = externalBatchMode ?? false;

  // 通用模版的特殊ID
  const GENERAL_TEMPLATE_ID = 'GENERAL_TEMPLATE';

  // 同步选中状态到外部
  const updateSelection = (updater: (prev: Set<string>) => Set<string>) => {
    setSelectedIds(prev => {
      const next = updater(prev);
      if (onSelectionChange) {
        const selectedInvitees: Invitee[] = [];
        // 如果选中了通用模版，添加通用模版项
        if (next.has(GENERAL_TEMPLATE_ID)) {
          selectedInvitees.push({
            id: GENERAL_TEMPLATE_ID,
            name: '通用模版',
          });
        }
        // 添加选中的嘉宾
        const selectedGuestInvitees = invitees.filter(inv => next.has(inv.id));
        selectedInvitees.push(...selectedGuestInvitees);
        onSelectionChange(selectedInvitees);
      }
      return next;
    });
  };

  // 获取嘉宾列表
  useEffect(() => {
    const fetchInvitees = async () => {
      if (!worksId) return;
      try {
        setLoadingInvitees(true);
        const data = await trpc.rsvp.listInvitees.query({
          works_id: worksId,
        });
        setInvitees(data || []);
      } catch (error: any) {
        console.error('Failed to fetch invitees:', error);
        toast.error(error.message || '加载嘉宾列表失败');
      } finally {
        setLoadingInvitees(false);
      }
    };
    fetchInvitees();
  }, [worksId]);

  // 当外部多选模式关闭时，清空内部选择状态
  useEffect(() => {
    if (externalBatchMode === false) {
      setSelectedIds(new Set());
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  }, [externalBatchMode, onSelectionChange]);

  // 非批量模式下同步 URL 中的 active 名称为选中项
  useEffect(() => {
    if (isBatchMode) {
      setFocusedInviteeId(null);
      return;
    }
    if (!activeInviteeName) {
      setFocusedInviteeId(null);
      return;
    }
    const target = invitees.find(inv => inv.name === activeInviteeName);
    setFocusedInviteeId(target?.id || null);
  }, [activeInviteeName, invitees, isBatchMode]);

  // 解析文本为姓名列表（支持换行、空格、英文逗号、中文逗号分隔）
  const parseNames = (text: string): string[] => {
    // 先按换行分割
    const lines = text.split('\n');
    const names: string[] = [];
    lines.forEach(line => {
      // 按空格、逗号（中英文）分割
      const lineNames = line
        .split(/[\s,，]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      names.push(...lineNames);
    });
    return names;
  };

  // 创建单个或批量嘉宾（自动检测分隔符）
  const handleCreateSingleInvitee = async () => {
    // 优先从真实 DOM 里拿值，兼容某些移动端 / WebView 对受控组件粘贴事件支持不完整的情况
    const rawInput = singleInviteeInputRef.current?.value ?? singleInviteeName;
    const input = rawInput.trim();
    if (!input) {
      toast.error('请输入姓名');
      return;
    }

    // 检测是否包含分隔符（空格、逗号中英文）
    const hasSeparator = /[\s,，]/.test(input);

    // 如果包含分隔符，则批量创建
    if (hasSeparator) {
      const names = parseNames(input);
      if (names.length === 0) {
        toast.error('请输入至少一个姓名');
        return;
      }

      setCreatingSingleInvitee(true);
      try {
        const result = await trpc.rsvp.batchCreateInvitees.mutate({
          names: names,
          works_id: worksId || undefined,
        });

        const failedResults = result.results.filter(r => !r.success);
        if (failedResults.length > 0) {
          failedResults.forEach(r => {
            toast.error(`创建 ${r.name} 失败: ${r.error || '创建失败'}`);
          });
        }

        if (result.successCount > 0) {
          toast.success(`成功创建 ${result.successCount} 位嘉宾`);
          setSingleInviteeName('');
          if (singleInviteeInputRef.current) {
            singleInviteeInputRef.current.value = '';
          }
          // 刷新列表
          const data = await trpc.rsvp.listInvitees.query({
            works_id: worksId,
          });
          setInvitees(data || []);
        } else {
          toast.error('没有成功创建任何嘉宾');
        }
      } catch (error: any) {
        toast.error(error.message || '创建失败');
      } finally {
        setCreatingSingleInvitee(false);
      }
    } else {
      // 单个创建
      setCreatingSingleInvitee(true);
      try {
        await trpc.rsvp.createInvitee.mutate({
          name: input,
          works_id: worksId || undefined,
        });
        toast.success('创建成功');
        setSingleInviteeName('');
        if (singleInviteeInputRef.current) {
          singleInviteeInputRef.current.value = '';
        }
        // 刷新列表
        const data = await trpc.rsvp.listInvitees.query({
          works_id: worksId,
        });
        setInvitees(data || []);
      } catch (error: any) {
        toast.error(error.message || '创建失败');
      } finally {
        setCreatingSingleInvitee(false);
      }
    }
  };

  // 批量创建嘉宾
  const handleCreateInvitees = async () => {
    const names = parseNames(inviteeNames);
    if (names.length === 0) {
      toast.error('请输入至少一个姓名');
      return;
    }

    setCreatingInvitee(true);
    try {
      const result = await trpc.rsvp.batchCreateInvitees.mutate({
        names: names,
        works_id: worksId || undefined,
      });

      const failedResults = result.results.filter(r => !r.success);
      if (failedResults.length > 0) {
        failedResults.forEach(r => {
          toast.error(`创建 ${r.name} 失败: ${r.error || '创建失败'}`);
        });
      }

      if (result.successCount > 0) {
        toast.success(`成功创建 ${result.successCount} 位嘉宾`);
        setInviteeNames('');
        setShowAddInviteeDialog(false);
        // 刷新列表
        const data = await trpc.rsvp.listInvitees.query({
          works_id: worksId,
        });
        setInvitees(data || []);
      } else {
        toast.error('没有成功创建任何嘉宾');
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvitee(false);
    }
  };

  // 处理列表项点击
  const handleInviteeClick = (invitee: Invitee | null) => {
    if (!invitee) {
      // 通用模版
      if (isBatchMode) {
        // 多选模式下，切换选中状态
        updateSelection(prev => {
          const newSet = new Set(prev);
          if (newSet.has(GENERAL_TEMPLATE_ID)) {
            newSet.delete(GENERAL_TEMPLATE_ID);
          } else {
            newSet.add(GENERAL_TEMPLATE_ID);
          }
          return newSet;
        });
      }
      return;
    }

    if (isBatchMode) {
      // 多选模式下，点击切换选中状态
      updateSelection(prev => {
        const newSet = new Set(prev);
        if (newSet.has(invitee.id)) {
          newSet.delete(invitee.id);
        } else {
          newSet.add(invitee.id);
        }
        return newSet;
      });
    } else {
      // 非多选模式下，设置内部激活状态，用于显示编辑按钮
      setFocusedInviteeId(invitee.id);
    }
  };

  // 保存编辑的名字
  const handleSaveEdit = async (inviteeId: string) => {
    const name = editingName.trim();
    if (!name) {
      toast.error('请输入姓名');
      return;
    }

    setUpdatingInvitee(true);
    try {
      await trpc.rsvp.updateInvitee.mutate({
        id: inviteeId,
        name: name,
      });
      toast.success('更新成功');
      setEditingInviteeId(null);
      setEditingName('');
      // 刷新列表
      const data = await trpc.rsvp.listInvitees.query({
        works_id: worksId,
      });
      setInvitees(data || []);
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    } finally {
      setUpdatingInvitee(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingInviteeId(null);
    setEditingName('');
  };

  // 开始编辑
  const handleStartEdit = (e: React.MouseEvent, invitee: Invitee) => {
    e.stopPropagation();
    setEditingInviteeId(invitee.id);
    setEditingName(invitee.name);
  };

  // 处理下载
  const handleDownload = (e: React.MouseEvent, invitee: Invitee | null) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(invitee);
    } else {
      // 如果没有外部回调，使用默认行为
      if (invitee) {
        onSelectionChange?.([invitee]);
      } else {
        onSelectionChange?.([]);
      }
    }
  };

  // 处理查看
  const handlePreview = (e: React.MouseEvent, invitee: Invitee | null) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(invitee);
    } else {
      // 如果没有外部回调，使用默认行为
      if (invitee) {
        onSelectionChange?.([invitee]);
      } else {
        onSelectionChange?.([]);
      }
    }
  };
  // 批量删除
  const handleBatchDelete = async () => {
    // 过滤掉通用模版，只删除嘉宾
    const guestIds = Array.from(selectedIds).filter(
      id => id !== GENERAL_TEMPLATE_ID
    );
    if (guestIds.length === 0) {
      toast.error('请至少选择一个嘉宾（通用模版无法删除）');
      return;
    }

    if (
      !confirm(
        `确定要删除选中的 ${guestIds.length} 位嘉宾吗？已发送的链接仍然有效。`
      )
    ) {
      return;
    }

    setDeletingInvitees(true);
    try {
      const deletePromises = guestIds.map(id =>
        trpc.rsvp.deleteInvitee.mutate({ id })
      );
      await Promise.all(deletePromises);
      toast.success(`成功删除 ${guestIds.length} 位嘉宾`);
      // 删除后清空选择状态（通用模版不可选择）
      updateSelection(() => new Set());
      // 刷新列表
      const data = await trpc.rsvp.listInvitees.query({
        works_id: worksId,
      });
      setInvitees(data || []);
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    } finally {
      setDeletingInvitees(false);
    }
  };

  // 判断通用模版是否激活
  // 非批量模式：当 activeInviteeName 为 null/undefined 或 '通用模版' 时激活
  // 批量模式：当 selectedIds 包含 GENERAL_TEMPLATE_ID 时激活
  const isGeneralTemplateActive = isBatchMode
    ? selectedIds.has(GENERAL_TEMPLATE_ID)
    : !activeInviteeName || activeInviteeName === '通用模版';

  return (
    <>
      <div className='px-4 bg-white h-full max-h-full flex flex-col overflow-hidden'>
        {/* 顶部标题区域 */}
        <div className='flex items-center justify-between mb-4 pt-4'>
          <div className='text-xs text-gray-500'>
            支持批量粘贴（空格、逗号中英文分隔）
          </div>
        </div>
        {isBatchMode ? (
          <div className='mb-4 h-10 w-full'>
            <Button
              variant='outline'
              size='sm'
              className='border-red-500 text-red-500 w-full h-full'
              onClick={handleBatchDelete}
              disabled={
                Array.from(selectedIds).filter(id => id !== GENERAL_TEMPLATE_ID)
                  .length === 0 || deletingInvitees
              }
            >
              <Trash2 size={16} className='mr-2' />
              删除 (
              {
                Array.from(selectedIds).filter(id => id !== GENERAL_TEMPLATE_ID)
                  .length
              }
              )
            </Button>
          </div>
        ) : (
          <div className='mb-4 h-10'>
            <div className='flex items-center gap-2'>
              <Input
                ref={singleInviteeInputRef}
                className='flex-1 rounded-lg text-base'
                placeholder='输入姓名，支持批量粘贴（空格/逗号分隔）...'
                onChange={e => setSingleInviteeName(e.target.value)}
                // onKeyDown={e => {
                //   if (e.key === 'Enter' && !creatingSingleInvitee) {
                //     e.preventDefault();
                //     handleCreateSingleInvitee();
                //   }
                // }}
              />
              <Button
                size='sm'
                className='bg-gray-800 text-white rounded-lg'
                onClick={handleCreateSingleInvitee}
                disabled={creatingSingleInvitee}
              >
                {creatingSingleInvitee ? '添加中...' : '添加'}
              </Button>
            </div>
          </div>
        )}

        {/* 嘉宾列表 */}
        {loadingInvitees ? (
          <div className='text-sm text-gray-500 text-center py-4'>
            加载中...
          </div>
        ) : (
          <div className='space-y-2 flex-1 overflow-y-auto'>
            {/* 通用模版项 */}
            <InviteeItem
              invitee={null}
              index={0}
              isActive={!isBatchMode && isGeneralTemplateActive}
              isSelected={isBatchMode && selectedIds.has(GENERAL_TEMPLATE_ID)}
              isFocused={false}
              isEditing={false}
              isBatchMode={isBatchMode}
              onToggleSelection={() => {
                updateSelection(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(GENERAL_TEMPLATE_ID)) {
                    newSet.delete(GENERAL_TEMPLATE_ID);
                  } else {
                    newSet.add(GENERAL_TEMPLATE_ID);
                  }
                  return newSet;
                });
              }}
              onClick={() => handleInviteeClick(null)}
              onDownload={onDownload ? e => handleDownload(e, null) : undefined}
              onPreview={onPreview ? e => handlePreview(e, null) : undefined}
              showDownloadButton={!!onDownload}
              showPreviewButton={!!onPreview}
            />

            {/* 嘉宾列表项 */}
            {invitees.map((invitee, index) => {
              const isSelected = isBatchMode && selectedIds.has(invitee.id);
              const isActive =
                !isBatchMode && activeInviteeName === invitee.name;
              const isEditing = !isBatchMode && editingInviteeId === invitee.id;
              const isFocused = !isBatchMode && focusedInviteeId === invitee.id;
              return (
                <InviteeItem
                  key={invitee.id}
                  invitee={invitee}
                  index={index + 1}
                  isActive={isActive}
                  isSelected={isSelected}
                  isFocused={isFocused}
                  isEditing={isEditing}
                  isBatchMode={isBatchMode}
                  editingName={editingName}
                  updatingInvitee={updatingInvitee}
                  onEditingNameChange={setEditingName}
                  onSaveEdit={() => handleSaveEdit(invitee.id)}
                  onCancelEdit={handleCancelEdit}
                  onStartEdit={e => handleStartEdit(e, invitee)}
                  onToggleSelection={() => {
                    updateSelection(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(invitee.id)) {
                        newSet.delete(invitee.id);
                      } else {
                        newSet.add(invitee.id);
                      }
                      return newSet;
                    });
                  }}
                  onClick={() => !isEditing && handleInviteeClick(invitee)}
                  onDownload={
                    onDownload ? e => handleDownload(e, invitee) : undefined
                  }
                  onPreview={
                    onPreview ? e => handlePreview(e, invitee) : undefined
                  }
                  showEditButton={isFocused}
                  showDownloadButton={!!onDownload}
                  showPreviewButton={!!onPreview}
                />
              );
            })}
            {invitees.length === 0 && (
              <div className='text-sm text-gray-500 text-center py-4'>
                暂无嘉宾，点击上方按钮添加
              </div>
            )}
          </div>
        )}
      </div>

      {/* 添加嘉宾弹窗 */}
      <ResponsiveDialog
        isOpen={showAddInviteeDialog}
        onOpenChange={setShowAddInviteeDialog}
        title='邀请嘉宾'
        isDialog
        contentProps={{
          className: 'max-w-[90vw]',
        }}
      >
        <div className='p-4'>
          <div className='text-base font-semibold text-gray-900 mb-2'>
            嘉宾名单
          </div>
          <div className='text-xs text-gray-400 mb-4'>
            支持换行、逗号（中英文）分隔，可一次添加多个嘉宾
          </div>

          <div className='mb-4'>
            <Textarea
              className='w-full min-h-[120px] text-base'
              value={inviteeNames}
              onChange={e => setInviteeNames(e.target.value)}
              placeholder={
                '例如：\n王小明\n李小红\n张三\n\n或：\n王小明，李小红，张三'
              }
            />
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => {
                setShowAddInviteeDialog(false);
                setInviteeNames('');
              }}
            >
              取消
            </Button>
            <Button
              className='flex-1 bg-gray-800 text-white'
              onClick={handleCreateInvitees}
              disabled={creatingInvitee || !inviteeNames.trim()}
            >
              {creatingInvitee ? '创建中...' : '创建嘉宾'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
