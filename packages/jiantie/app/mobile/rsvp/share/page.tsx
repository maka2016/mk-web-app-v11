'use client';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
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
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any[]>>(
    {}
  );
  const [viewingInvitee, setViewingInvitee] = useState<any>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

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

  // 查询每个嘉宾的提交记录
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!formConfigId || invitees.length === 0) return;
      const newMap: Record<string, any[]> = {};
      for (const invitee of invitees) {
        try {
          const submissions = await trpc.rsvp.getInviteeSubmissions.query({
            contact_id: invitee.id,
            form_config_id: formConfigId,
          });
          newMap[invitee.id] = submissions || [];
        } catch (error: any) {
          console.error(
            `Failed to fetch submissions for ${invitee.id}:`,
            error
          );
          newMap[invitee.id] = [];
        }
      }
      setSubmissionsMap(newMap);
    };
    fetchSubmissions();
  }, [formConfigId, invitees]);

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
                const submissions = submissionsMap[invitee.id] || [];
                const latestSubmission = submissions[0]; // 最新的提交记录
                const hasSubmission = latestSubmission !== undefined;
                const statusText = hasSubmission
                  ? latestSubmission.will_attend === true
                    ? '已确认出席'
                    : latestSubmission.will_attend === false
                      ? '已确认不出席'
                      : '已提交'
                  : '待提交';
                const statusColor = hasSubmission
                  ? latestSubmission.will_attend === true
                    ? 'text-green-600'
                    : latestSubmission.will_attend === false
                      ? 'text-gray-500'
                      : 'text-blue-600'
                  : 'text-gray-400';

                return (
                  <div
                    key={invitee.id}
                    className='flex items-center justify-between p-2 border border-[#e4e4e7] rounded-md'
                  >
                    <div className='flex-1'>
                      <div className='font-semibold text-sm leading-5'>
                        {invitee.name}
                      </div>
                      <div className={`text-xs mt-1 ${statusColor}`}>
                        {statusText}
                        {hasSubmission && latestSubmission.create_time && (
                          <span className='ml-2 text-gray-400'>
                            {new Date(
                              latestSubmission.create_time
                            ).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setViewingInvitee({ ...invitee, submissions });
                        setSubmissionDialogOpen(true);
                      }}
                      disabled={!hasSubmission}
                    >
                      查看
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 提交记录详情弹窗 */}
        <ResponsiveDialog
          isOpen={submissionDialogOpen}
          onOpenChange={setSubmissionDialogOpen}
          title={viewingInvitee ? `${viewingInvitee.name}的提交记录` : ''}
        >
          {viewingInvitee && (
            <div className='px-4 pb-4 max-h-[70vh] overflow-y-auto'>
              {viewingInvitee.submissions.length === 0 ? (
                <div className='text-sm text-gray-500 text-center py-8'>
                  暂无提交记录
                </div>
              ) : (
                <div className='space-y-4'>
                  {viewingInvitee.submissions.map(
                    (submission: any, index: number) => (
                      <div
                        key={submission.id}
                        className='border border-[#e4e4e7] rounded-md p-3'
                      >
                        <div className='flex items-center justify-between mb-2'>
                          <div className='font-semibold text-sm'>
                            {index === 0
                              ? '最新提交'
                              : `提交记录 #${index + 1}`}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {new Date(submission.create_time).toLocaleString(
                              'zh-CN'
                            )}
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <div className='flex items-center gap-2'>
                            <span className='text-xs text-gray-600'>
                              出席状态：
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                submission.will_attend === true
                                  ? 'text-green-600'
                                  : submission.will_attend === false
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                              }`}
                            >
                              {submission.will_attend === true
                                ? '确认出席'
                                : submission.will_attend === false
                                  ? '确认不出席'
                                  : '未选择'}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-xs text-gray-600'>
                              审核状态：
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                submission.status === 'approved'
                                  ? 'text-green-600'
                                  : submission.status === 'rejected'
                                    ? 'text-red-600'
                                    : submission.status === 'cancelled'
                                      ? 'text-gray-500'
                                      : 'text-yellow-600'
                              }`}
                            >
                              {submission.status === 'approved'
                                ? '已确认'
                                : submission.status === 'rejected'
                                  ? '已拒绝'
                                  : submission.status === 'cancelled'
                                    ? '已取消'
                                    : '待审核'}
                            </span>
                          </div>
                          {submission.submission_data &&
                            typeof submission.submission_data === 'object' &&
                            Object.keys(submission.submission_data).filter(
                              key => !key.startsWith('_')
                            ).length > 0 && (
                              <div className='mt-3 pt-3 border-t border-gray-200'>
                                <div className='text-xs font-semibold text-gray-700 mb-2'>
                                  表单数据：
                                </div>
                                <div className='space-y-1'>
                                  {Object.entries(
                                    submission.submission_data
                                  ).map(([key, value]) => {
                                    if (key.startsWith('_')) return null;
                                    return (
                                      <div
                                        key={key}
                                        className='flex items-start justify-between text-xs'
                                      >
                                        <span className='text-gray-600 flex-shrink-0 mr-2'>
                                          {key}：
                                        </span>
                                        <span className='text-gray-800 text-right flex-1'>
                                          {typeof value === 'object'
                                            ? JSON.stringify(value)
                                            : String(value)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </ResponsiveDialog>
      </div>
    </div>
  );
}
