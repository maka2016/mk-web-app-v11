'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ChevronRight, Globe, Users } from 'lucide-react';
import { useState } from 'react';
import { PublicShareDialog } from '../../app/mobile/rsvp/invitees/PublicShareDialog';

interface RSVPShareOptionsProps {
  worksId: string;
  formConfigId?: string;
}

export function RSVPShareOptions({
  worksId,
  formConfigId,
}: RSVPShareOptionsProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'public' | 'invitee'>('public');
  const [shareContactId, setShareContactId] = useState<string | undefined>();
  const [shareContactName, setShareContactName] = useState<
    string | undefined
  >();
  const [inviteeDialogOpen, setInviteeDialogOpen] = useState(false);
  const [inviteeName, setInviteeName] = useState<string>('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);

  // 创建嘉宾并分享
  const handleCreateInvitee = async () => {
    if (!inviteeName.trim()) {
      return;
    }

    setCreatingInvitee(true);
    try {
      // 创建嘉宾
      const newInvitee = await trpc.rsvp.createInvitee.mutate({
        name: inviteeName.trim(),
      });

      // 如果提供了 form_config_id，关联到表单
      if (formConfigId) {
        try {
          await trpc.rsvp.linkInviteeToForm.mutate({
            contact_id: newInvitee.id,
            form_config_id: formConfigId,
          });
        } catch (error: any) {
          console.warn('关联嘉宾到表单失败:', error);
        }
      }

      // 打开分享对话框
      setShareMode('invitee');
      setShareContactId(newInvitee.id);
      setShareContactName(newInvitee.name);
      setShareDialogOpen(true);
      setInviteeDialogOpen(false);
      setInviteeName('');
    } catch (error: any) {
      console.error('创建嘉宾失败:', error);
    } finally {
      setCreatingInvitee(false);
    }
  };

  return (
    <>
      {/* 指定宾客卡片 */}
      <div className='bg-white border border-gray-100 rounded-xl p-4 cursor-pointer shadow-sm'>
        <div
          className='flex items-center justify-between'
          onClick={() => setInviteeDialogOpen(true)}
        >
          <div className='flex items-start gap-3 flex-1'>
            <div className='w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0'>
              <Users size={20} className='text-purple-600' />
            </div>
            <div className='flex-1 flex flex-col justify-center'>
              <div className='flex items-center gap-2'>
                <div className='font-semibold text-base text-[#09090B]'>
                  指定宾客
                </div>
                <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600'>
                  推荐
                </span>
              </div>
              <div className='text-xs text-gray-600'>
                为某位嘉宾创建专属链接并单独邀请
              </div>
            </div>
          </div>
          <ChevronRight
            size={20}
            className='text-gray-400 flex-shrink-0 ml-2'
          />
        </div>
      </div>

      {/* 公开分享卡片 */}
      <div className='bg-white border border-gray-100 rounded-xl p-4 cursor-pointer shadow-sm'>
        <div
          className='flex items-center justify-between'
          onClick={() => {
            setShareMode('public');
            setShareContactId(undefined);
            setShareContactName(undefined);
            setShareDialogOpen(true);
          }}
        >
          <div className='flex items-start gap-3 flex-1'>
            <div className='w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0'>
              <Globe size={20} className='text-blue-500' />
            </div>
            <div className='flex-1 flex flex-col justify-center'>
              <div className='font-semibold text-base text-[#09090B]'>
                公开分享
              </div>
              <div className='text-xs text-gray-600'>
                生成公开链接,任何人可填写回执
              </div>
            </div>
          </div>
          <ChevronRight
            size={20}
            className='text-gray-400 flex-shrink-0 ml-2'
          />
        </div>
      </div>

      {/* 创建嘉宾对话框 */}
      <ResponsiveDialog
        isOpen={inviteeDialogOpen}
        onOpenChange={setInviteeDialogOpen}
        title='创建嘉宾'
      >
        <div className='p-4'>
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
          <div className='flex gap-2 mb-3'>
            <Button
              variant='outline'
              className='flex-1 h-11'
              onClick={() => {
                setInviteeDialogOpen(false);
                setInviteeName('');
              }}
            >
              取消
            </Button>
            <Button
              className='flex-1 h-11 bg-gray-800 hover:bg-gray-900 text-white'
              onClick={handleCreateInvitee}
              disabled={creatingInvitee || !inviteeName.trim()}
            >
              {creatingInvitee ? '创建中...' : '创建并分享'}
            </Button>
          </div>
          <div className='text-xs text-gray-500 leading-5'>
            您只需填写姓名即可创建专属链接；其他信息可由对方填写或后续添加。
          </div>
        </div>
      </ResponsiveDialog>

      {/* 分享对话框 */}
      <PublicShareDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        worksId={worksId}
        mode={shareMode}
        contactId={shareContactId}
        contactName={shareContactName}
      />
    </>
  );
}
