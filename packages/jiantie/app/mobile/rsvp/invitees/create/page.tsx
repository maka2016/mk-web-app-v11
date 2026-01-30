'use client';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../../RSVPLayoutContext';
import { InviteeList } from './InviteeList';

export default function CreateInviteePage() {
  const { setTitle } = useRSVPLayout();

  // 设置页面标题
  useEffect(() => {
    setTitle('指定嘉宾');
  }, [setTitle]);
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id') || '';

  const [inviteeNames, setInviteeNames] = useState<string>('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [hasInvitees, setHasInvitees] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // 记录是否已经自动弹出过弹窗，避免重复弹出
  const hasAutoOpenedRef = useRef(false);

  // 解析文本为姓名列表（支持换行、英文逗号、中文逗号分隔）
  const parseNames = (text: string): string[] => {
    // 先按换行符分割
    const lines = text.split('\n');
    const names: string[] = [];

    lines.forEach(line => {
      // 对每一行，按逗号（中英文）分割
      const lineNames = line
        .split(/[,，]/) // 支持英文逗号和中文逗号
        .map(name => name.trim())
        .filter(name => name.length > 0);
      names.push(...lineNames);
    });

    return names;
  };

  // 点击创建按钮，先显示确认弹窗
  const handleCreateClick = () => {
    const names = parseNames(inviteeNames);
    if (names.length === 0) {
      toast.error('请输入至少一个姓名');
      return;
    }
    setPendingNames(names);
    setShowConfirmDialog(true);
  };

  // 确认后执行创建操作
  const handleConfirmCreate = async () => {
    if (pendingNames.length === 0) {
      toast.error('没有可创建的嘉宾');
      return;
    }
    toast.loading('创建中...');
    setShowConfirmDialog(false);
    setCreatingInvitee(true);

    try {
      // 批量创建嘉宾
      const result = await trpc.rsvp.batchCreateInvitees.mutate({
        names: pendingNames,
        works_id: worksId || undefined,
      });

      // 显示失败的错误信息
      const failedResults = result.results.filter(r => !r.success);
      if (failedResults.length > 0) {
        failedResults.forEach(r => {
          toast.error(`创建 ${r.name} 失败: ${r.error || '创建失败'}`);
        });
      }

      if (result.successCount > 0) {
        toast.dismiss();
        toast.success(`成功创建 ${result.successCount} 位嘉宾`);
        // 清空输入
        setInviteeNames('');
        setPendingNames([]);
        // 关闭创建弹窗
        setShowCreateDialog(false);
        // 标记为有嘉宾
        setHasInvitees(true);
        // 重置自动弹出标记，以便下次没有嘉宾时可以再次弹出
        hasAutoOpenedRef.current = false;
        // 刷新列表
        setRefreshKey(prev => prev + 1);
      } else {
        toast.error('没有成功创建任何嘉宾');
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvitee(false);
    }
  };

  return (
    <div className='p-4'>
      {/* 嘉宾列表 */}
      {worksId ? (
        <InviteeList
          key={refreshKey}
          worksId={worksId}
          showCreateDialog={showCreateDialog}
          setShowCreateDialog={setShowCreateDialog}
          onLoad={(hasData: boolean) => {
            setHasInvitees(hasData);
            // 如果没有嘉宾且还没有自动弹出过，自动弹出创建弹窗（仅一次）
            if (!hasData && !hasAutoOpenedRef.current && !showCreateDialog) {
              hasAutoOpenedRef.current = true;
              setShowCreateDialog(true);
            }
          }}
        />
      ) : (
        <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center text-gray-500'>
          未找到作品ID
        </div>
      )}

      {/* 创建嘉宾弹窗 */}
      <ResponsiveDialog
        isOpen={showCreateDialog}
        onOpenChange={setShowCreateDialog}
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
              className='w-full min-h-[120px]'
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
                setShowCreateDialog(false);
                setInviteeNames('');
                // 标记已经手动关闭过弹窗，不再自动弹出
                hasAutoOpenedRef.current = true;
              }}
            >
              取消
            </Button>
            <Button
              className='flex-1 bg-gray-800 text-white'
              onClick={handleCreateClick}
              disabled={creatingInvitee || !inviteeNames.trim()}
            >
              {creatingInvitee ? '创建中...' : '创建嘉宾'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 确认弹窗 */}
      <ResponsiveDialog
        isOpen={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title='确认创建嘉宾'
        isDialog
        contentProps={{
          className: 'max-w-[90vw]',
        }}
      >
        <div className='p-4'>
          <div className='text-sm text-gray-600 mb-4'>
            即将创建以下 {pendingNames.length} 位嘉宾：
          </div>
          <div className='max-h-[300px] overflow-y-auto mb-4'>
            <div className='space-y-2'>
              {pendingNames.map((name, index) => (
                <div
                  key={index}
                  className='text-sm text-gray-700 p-2 bg-gray-50 rounded'
                >
                  {index + 1}. {name}
                </div>
              ))}
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => setShowConfirmDialog(false)}
            >
              取消
            </Button>
            <Button
              className='flex-1 bg-gray-800 text-white'
              onClick={handleConfirmCreate}
            >
              确认创建
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
