'use client';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { Separator } from '@workspace/ui/components/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function RSVPSharePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const [copied, setCopied] = useState<boolean>(false);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 生成公开链接
  const publicLink = useMemo(() => {
    if (typeof window === 'undefined' || !worksId) return '';
    const origin = window.location.origin;
    return `${origin}/viewer2/${worksId}`;
  }, [worksId]);

  // 查询嘉宾列表
  useEffect(() => {
    const fetchInvitees = async () => {
      if (!formConfigId) return;
      setLoading(true);
      try {
        const data = await trpc.rsvp.listInvitees.query({
          form_config_id: formConfigId,
        });
        setInvitees(data || []);
      } catch (error: any) {
        toast.error(error.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitees();
  }, [formConfigId]);

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
      toast.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除嘉宾
  const handleDeleteInvitee = async (id: string) => {
    if (!confirm('确定要删除该嘉宾吗？已发送的链接仍然有效。')) {
      return;
    }
    try {
      await trpc.rsvp.deleteInvitee.mutate({ id });
      toast.success('删除成功');
      fetchInvitees();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('复制成功');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvitee = (invitee: any) => {
    // 生成专属链接
    // URLSearchParams.set() 会自动编码，不需要手动 encodeURIComponent
    const params = new URLSearchParams();
    params.set('rsvp_invitee', invitee.name);
    const shareLink = `${window.location.origin}/viewer2/${worksId}?${params.toString()}`;

    // 复制链接
    handleCopyLink(shareLink);
  };

  if (!formConfigId) {
    return (
      <div className='w-full py-4 text-center text-sm text-gray-500'>
        参数错误，请先保存表单配置
      </div>
    );
  }

  return (
    <div className='relative'>
      <div className='px-4 py-3 border-b border-black/[0.06]'>
        <div className='flex items-center gap-2'>
          <Icon name='share' />
          <span className='font-semibold text-lg leading-[26px]'>分享设置</span>
        </div>
      </div>
      <Separator />

      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4'>
        {/* 公开链接分享 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            公开链接分享
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Input
                className='flex-1 bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                value={publicLink}
                readOnly
              />
              <Button
                size='sm'
                variant='outline'
                onClick={() => handleCopyLink(publicLink)}
              >
                {copied ? '已复制' : '复制链接'}
              </Button>
            </div>
          </div>
        </div>

        {/* 指定嘉宾分享 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='flex items-center justify-between mb-3'>
            <div className='font-semibold text-base leading-6 text-[#09090B]'>
              指定嘉宾分享
            </div>
            <Button
              variant='outline'
              className='text-[#3358D4] h-8 font-semibold hover:bg-transparent'
              size='sm'
              onClick={() => {
                router.push(
                  `/mobile/rsvp/invitees?form_config_id=${formConfigId}&works_id=${worksId}`
                );
              }}
            >
              <Icon name='add-one' size={16} />
              添加嘉宾
            </Button>
          </div>
          <div className='space-y-2'>
            {loading ? (
              <div className='text-sm text-gray-500 text-center py-4'>
                加载中...
              </div>
            ) : invitees.length === 0 ? (
              <div className='text-sm text-gray-500 text-center py-4'>
                暂无嘉宾，点击&ldquo;添加嘉宾&rdquo;开始邀请
              </div>
            ) : (
              invitees.map((invitee: any) => (
                <div
                  key={invitee.id}
                  className='flex items-center justify-between p-2 border border-[#e4e4e7] rounded-md'
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
                      onClick={() => handleShareInvitee(invitee)}
                    >
                      分享
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        router.push(
                          `/mobile/rsvp/invitees?form_config_id=${formConfigId}&works_id=${worksId}&edit_id=${invitee.id}`
                        );
                      }}
                    >
                      编辑
                    </Button>
                    <Icon
                      name='delete-g8c551hn'
                      size={16}
                      onClick={() => handleDeleteInvitee(invitee.id)}
                      className='cursor-pointer text-red-500'
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 已邀请嘉宾的提交记录 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            已邀请嘉宾的提交记录
          </div>
          <div className='space-y-2'>
            {invitees.length === 0 ? (
              <div className='text-sm text-gray-500 text-center py-4'>
                暂无提交记录
              </div>
            ) : (
              invitees.map((invitee: any) => {
                // TODO: 查询该嘉宾的提交记录
                return (
                  <div
                    key={invitee.id}
                    className='flex items-center justify-between p-2 border border-[#e4e4e7] rounded-md'
                  >
                    <div className='flex-1'>
                      <div className='font-semibold text-sm leading-5'>
                        {invitee.name}
                      </div>
                      <div className='text-xs text-gray-500 mt-1'>待提交</div>
                    </div>
                    <Button size='sm' variant='ghost'>
                      查看
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
