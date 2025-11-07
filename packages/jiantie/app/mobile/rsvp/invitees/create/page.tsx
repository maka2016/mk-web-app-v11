'use client';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../../RSVPLayoutContext';

export default function CreateInviteePage() {
  const { setTitle } = useRSVPLayout();

  // 设置页面标题
  useEffect(() => {
    setTitle('指定嘉宾');
  }, [setTitle]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const [inviteeName, setInviteeName] = useState<string>('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);

  // 创建嘉宾
  const handleCreateInvitee = async () => {
    if (!inviteeName.trim()) {
      toast.error('请输入姓名');
      return;
    }

    setCreatingInvitee(true);
    try {
      // 创建嘉宾
      const createdInvitee = await trpc.rsvp.createInvitee.mutate({
        name: inviteeName.trim(),
      });

      // 如果提供了form_config_id，自动关联到表单
      if (formConfigId && createdInvitee) {
        try {
          await trpc.rsvp.linkInviteeToForm.mutate({
            contact_id: createdInvitee.id,
            form_config_id: formConfigId,
          });
        } catch (error: any) {
          console.warn('关联嘉宾到表单失败:', error);
        }
      }

      toast.success('创建成功');

      // 跳转到分享页面
      if (createdInvitee) {
        const shareUrl = `/mobile/rsvp/share?works_id=${worksId}&mode=invitee&contact_id=${createdInvitee.id}&contact_name=${encodeURIComponent(createdInvitee.name)}&form_config_id=${formConfigId}&from=create`;
        router.replace(shareUrl);
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvitee(false);
    }
  };

  return (
    <div className='p-4'>
      <div className='bg-white rounded-xl border border-gray-100 p-4 shadow-sm'>
        <div className='text-base font-semibold text-gray-900 mb-4'>
          创建嘉宾
        </div>

        <div className='mb-4'>
          <div className='text-sm font-medium text-gray-500 mb-2'>
            姓名（必填）
          </div>
          <Input
            className='w-full h-11'
            value={inviteeName}
            onChange={e => setInviteeName(e.target.value)}
            placeholder='例如：王小明'
          />
        </div>

        <Button
          className='w-full bg-gray-800 hover:bg-gray-900 text-white h-11 text-base font-medium'
          onClick={handleCreateInvitee}
          disabled={creatingInvitee || !inviteeName.trim()}
        >
          {creatingInvitee ? '创建中...' : '创建并分享'}
        </Button>

        <div className='mt-3 text-xs text-gray-500 leading-5'>
          您只需填写姓名即可创建专属链接；其他信息可由对方填写或后续添加。
        </div>
      </div>
    </div>
  );
}
