'use client';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function InviteeManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';
  const editId = searchParams.get('edit_id') || '';

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingInvitee, setEditingInvitee] = useState<any>(null);
  const [name, setName] = useState<string>('');
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 查询嘉宾列表
  useEffect(() => {
    if (!formConfigId) return;
    const fetchInvitees = async () => {
      setLoading(true);
      try {
        const data = await trpc.rsvp.listInvitees.query({
          form_config_id: formConfigId,
        });
        setInvitees(data || []);
      } catch (error: any) {
        toast.error(error.message || '查询失败');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitees();
  }, [formConfigId]);

  // 查询要编辑的嘉宾
  useEffect(() => {
    if (!editId) return;
    const fetchInviteeById = async () => {
      try {
        const data = await trpc.rsvp.getInviteeById.query({ id: editId });
        if (data) {
          setEditingInvitee(data);
          setName(data.name || '');
          setDialogOpen(true);
        }
      } catch (error: any) {
        toast.error(error.message || '查询失败');
      }
    };
    fetchInviteeById();
  }, [editId]);

  // 刷新列表函数
  const fetchInvitees = async () => {
    if (!formConfigId) return;
    setLoading(true);
    try {
      const data = await trpc.rsvp.listInvitees.query({
        form_config_id: formConfigId,
      });
      setInvitees(data || []);
    } catch (error: any) {
      toast.error(error.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建嘉宾
  const handleCreate = async () => {
    try {
      await trpc.rsvp.createInvitee.mutate({
        form_config_id: formConfigId,
        name: name.trim(),
      });
      toast.success('创建成功');
      fetchInvitees();
      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  // 更新嘉宾
  const handleUpdate = async () => {
    if (!editingInvitee) return;
    try {
      await trpc.rsvp.updateInvitee.mutate({
        id: editingInvitee.id,
        name: name.trim(),
      });
      toast.success('更新成功');
      fetchInvitees();
      resetForm();
      setDialogOpen(false);
      router.replace(
        `/mobile/rsvp-invitees?form_config_id=${formConfigId}&works_id=${worksId}`
      );
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  // 删除嘉宾
  const handleDelete = async (id: string) => {
    try {
      await trpc.rsvp.deleteInvitee.mutate({ id });
      toast.success('删除成功');
      fetchInvitees();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const resetForm = () => {
    setName('');
    setEditingInvitee(null);
    setDialogOpen(false);
    // 清除编辑ID
    if (editId) {
      router.replace(
        `/mobile/rsvp-invitees?form_config_id=${formConfigId}&works_id=${worksId}`
      );
    }
  };

  const handleOpenDialog = () => {
    setEditingInvitee(null);
    setName('');
    setDialogOpen(true);
  };

  const handleEditInvitee = (invitee: any) => {
    setEditingInvitee(invitee);
    setName(invitee.name || '');
    setDialogOpen(true);
    router.push(
      `/mobile/rsvp-invitees?form_config_id=${formConfigId}&works_id=${worksId}&edit_id=${invitee.id}`
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入姓名');
      return;
    }

    if (editingInvitee) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleDeleteConfirm = (id: string) => {
    if (confirm('确定要删除该嘉宾吗？已发送的链接仍然有效。')) {
      handleDelete(id);
    }
  };

  const handleShare = (invitee: any) => {
    // 生成专属链接
    // URLSearchParams.set() 会自动编码，不需要手动 encodeURIComponent
    const params = new URLSearchParams();
    params.set('rsvp_invitee', invitee.name);
    const shareLink = `${window.location.origin}/viewer2/${worksId}?${params.toString()}`;

    // 复制链接
    navigator.clipboard.writeText(shareLink);
    toast.success('链接已复制');
  };

  if (!formConfigId) {
    return (
      <div className='w-full py-4 text-center text-sm text-gray-500'>
        参数错误
      </div>
    );
  }

  return (
    <div className='relative'>
      <div className='px-4 py-3 border-b border-black/[0.06]'>
        <div className='flex items-center gap-2'>
          <Icon name='form-fill' />
          <span className='font-semibold text-lg leading-[26px]'>嘉宾管理</span>
        </div>
      </div>
      <Separator />

      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto'>
        {/* 嘉宾列表 */}
        <div className='space-y-2'>
          <div className='flex justify-end mb-2'>
            <Button
              variant='outline'
              className='text-[#3358D4] h-8 font-semibold hover:bg-transparent'
              size='sm'
              onClick={handleOpenDialog}
            >
              <Icon name='add-one' size={16} />
              添加嘉宾
            </Button>
          </div>
          {invitees.length === 0 ? (
            <div className='text-sm text-gray-500 text-center py-8'>
              暂无嘉宾
            </div>
          ) : (
            invitees.map((invitee: any) => (
              <div
                key={invitee.id}
                className='flex items-center justify-between p-3 border border-[#e4e4e7] rounded-md'
              >
                <div className='flex-1'>
                  <div className='font-semibold text-sm leading-5'>
                    {invitee.name}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => handleShare(invitee)}
                  >
                    分享
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => handleEditInvitee(invitee)}
                  >
                    编辑
                  </Button>
                  <Icon
                    name='delete-g8c551hn'
                    size={16}
                    onClick={() => handleDeleteConfirm(invitee.id)}
                    className='cursor-pointer text-red-500'
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      <ResponsiveDialog
        isOpen={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            // 关闭弹窗时重置表单
            resetForm();
          }
        }}
        title={editingInvitee ? '编辑嘉宾' : '添加嘉宾'}
      >
        <div className='px-4 pb-4'>
          <div className='space-y-4'>
            <div>
              <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                姓名 <span className='text-red-500'>*</span>
              </div>
              <Input
                className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='请输入嘉宾姓名'
              />
            </div>
            <div className='flex items-center gap-2 pt-2'>
              <Button
                className='flex-1'
                onClick={handleSubmit}
                disabled={loading}
              >
                {editingInvitee ? '保存' : '添加'}
              </Button>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setDialogOpen(false)}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
