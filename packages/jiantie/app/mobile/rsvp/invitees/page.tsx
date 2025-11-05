'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getIsOverSeas } from '@/services';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './share.module.scss';

export default function RSVPInviteesPage() {
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const isOversea = getIsOverSeas();

  const [copied, setCopied] = useState<boolean>(false);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [viewingSubmission, setViewingSubmission] = useState<any>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  console.log('allSubmissions', allSubmissions);

  // 嘉宾管理相关状态
  const [inviteeDialogOpen, setInviteeDialogOpen] = useState(false);
  const [editingInvitee, setEditingInvitee] = useState<any>(null);
  const [inviteeName, setInviteeName] = useState<string>('');

  // 分享面板相关状态
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentShareInvitee, setCurrentShareInvitee] = useState<any>(null);
  const [shareTitle, setShareTitle] = useState<string>('');
  const [isApp, setIsApp] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [showMiniPTip, setShowMiniPTip] = useState(false);
  const [executingKey, setExecutingKey] = useState<string | null>(null);

  const { toPosterShare } = useShareNavigation();

  // 生成公开链接
  const publicLink = useMemo(() => {
    if (typeof window === 'undefined' || !worksId) return '';
    const origin = window.location.origin;
    return `${origin}/viewer2/${worksId}`;
  }, [worksId]);

  // 生成嘉宾专属链接
  const generateInviteeLink = (invitee: any) => {
    const params = new URLSearchParams();
    params.set('rsvp_invitee', invitee.name);
    params.set('rsvp_contact_id', invitee.id);
    return `${window.location.origin}/viewer2/${worksId}?${params.toString()}`;
  };

  // 初始化 APP 环境判断
  useEffect(() => {
    const initAPP = async () => {
      await APPBridge.init();
      setIsApp(APPBridge.judgeIsInApp());
      setIsMiniP(APPBridge.judgeIsInMiniP());
    };
    initAPP();
  }, []);

  // 查询嘉宾列表
  useEffect(() => {
    const fetchInvitees = async () => {
      setLoading(true);
      try {
        // 嘉宾归属于用户，不再需要form_config_id
        const data = await trpc.rsvp.listInvitees.query({});
        setInvitees(data || []);
      } catch (error: any) {
        toast.error(error.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitees();
  }, []);

  // 查询所有提交记录
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!formConfigId) return;
      try {
        const submissions = await trpc.rsvp.getAllSubmissions.query({
          form_config_id: formConfigId,
        });

        console.log('submissions', submissions);
        setAllSubmissions(submissions || []);
      } catch (error: any) {
        console.error('Failed to fetch submissions:', error);
      }
    };
    fetchSubmissions();
  }, [formConfigId]);

  // 刷新列表函数
  const fetchInvitees = async () => {
    setLoading(true);
    try {
      // 嘉宾归属于用户，不再需要form_config_id
      const data = await trpc.rsvp.listInvitees.query({});
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

  // 打开添加嘉宾弹窗
  const handleOpenAddInvitee = () => {
    setEditingInvitee(null);
    setInviteeName('');
    setInviteeDialogOpen(true);
  };

  // 打开编辑嘉宾弹窗
  const handleOpenEditInvitee = (invitee: any) => {
    setEditingInvitee(invitee);
    setInviteeName(invitee.name || '');
    setInviteeDialogOpen(true);
  };

  // 创建嘉宾
  const handleCreateInvitee = async () => {
    try {
      // form_config_id改为可选，如果提供则用于生成专属链接
      await trpc.rsvp.createInvitee.mutate({
        form_config_id: formConfigId || undefined,
        name: inviteeName.trim(),
      });
      toast.success('创建成功');
      fetchInvitees();
      setInviteeDialogOpen(false);
      setInviteeName('');
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  // 更新嘉宾
  const handleUpdateInvitee = async () => {
    if (!editingInvitee) return;
    try {
      await trpc.rsvp.updateInvitee.mutate({
        id: editingInvitee.id,
        name: inviteeName.trim(),
      });
      toast.success('更新成功');
      fetchInvitees();
      setInviteeDialogOpen(false);
      setEditingInvitee(null);
      setInviteeName('');
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  // 提交嘉宾表单
  const handleSubmitInvitee = async () => {
    if (!inviteeName.trim()) {
      toast.error('请输入姓名');
      return;
    }

    if (editingInvitee) {
      await handleUpdateInvitee();
    } else {
      await handleCreateInvitee();
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('复制成功');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvitee = (invitee: any) => {
    // 打开分享面板
    setCurrentShareInvitee(invitee);
    setShareTitle(`邀请 ${invitee.name} 参加活动`);
    setShareDialogOpen(true);
  };

  // 分享到微信
  const shareToWechat = async (to: 'wechat' | 'wechatTimeline') => {
    if (!currentShareInvitee) return;
    if (!shareTitle) {
      toast.error('请填写分享标题');
      return;
    }

    const shareLink = generateInviteeLink(currentShareInvitee);

    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: shareTitle,
        content: `诚邀您参加活动`,
        thumb: '',
        type: 'link',
        shareType: to,
        url: shareLink,
      },
    });
  };

  // 复制专属链接
  const copyInviteeLink = () => {
    if (!currentShareInvitee) return;
    const shareLink = generateInviteeLink(currentShareInvitee);
    handleCopyLink(shareLink);
  };

  // 保存长图
  const savePoster = async () => {
    if (!worksId) return;
    toPosterShare(worksId);
  };

  // 显示小程序分享提示
  const showMiniPShareTip = () => {
    setShowMiniPTip(true);
  };

  // 不再强制要求formConfigId，因为嘉宾归属于用户
  // 但需要worksId用于生成链接

  return (
    <div className='relative bg-white'>
      <MobileHeader title={'嘉宾邀请'} />

      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4'>
        {/* 公开链接分享 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            公开链接分享
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setShareDialogOpen(true);
                }}
              >
                公开分享
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
              onClick={handleOpenAddInvitee}
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
                      onClick={() => handleOpenEditInvitee(invitee)}
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

        {/* 所有提交记录 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            所有提交记录
          </div>
          <div className='space-y-2'>
            {allSubmissions.length === 0 ? (
              <div className='text-sm text-gray-500 text-center py-4'>
                暂无提交记录
              </div>
            ) : (
              allSubmissions.map((submission: any) => {
                const statusText =
                  submission.will_attend === true
                    ? '已确认出席'
                    : submission.will_attend === false
                      ? '已确认不出席'
                      : '已提交';
                const statusColor =
                  submission.will_attend === true
                    ? 'text-green-600'
                    : submission.will_attend === false
                      ? 'text-gray-500'
                      : 'text-blue-600';

                return (
                  <div
                    key={submission.id}
                    className='flex items-center justify-between p-2 border border-[#e4e4e7] rounded-md'
                  >
                    <div className='flex-1'>
                      <div className='font-semibold text-sm leading-5'>
                        {submission.invitee_name}
                      </div>
                      <div className={`text-xs mt-1 ${statusColor}`}>
                        {statusText}
                        {submission.create_time && (
                          <span className='ml-2 text-gray-400'>
                            {new Date(submission.create_time).toLocaleString(
                              'zh-CN',
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setViewingSubmission(submission);
                        setSubmissionDialogOpen(true);
                      }}
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
          title={
            viewingSubmission
              ? `${viewingSubmission.invitee_name}的提交详情`
              : ''
          }
        >
          {viewingSubmission && (
            <div className='px-4 pb-4 max-h-[70vh] overflow-y-auto'>
              <div className='border border-[#e4e4e7] rounded-md p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='font-semibold text-sm'>提交时间</div>
                  <div className='text-xs text-gray-500'>
                    {new Date(viewingSubmission.create_time).toLocaleString(
                      'zh-CN'
                    )}
                  </div>
                </div>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-gray-600'>出席状态：</span>
                    <span
                      className={`text-xs font-semibold ${
                        viewingSubmission.will_attend === true
                          ? 'text-green-600'
                          : viewingSubmission.will_attend === false
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {viewingSubmission.will_attend === true
                        ? '确认出席'
                        : viewingSubmission.will_attend === false
                          ? '确认不出席'
                          : '未选择'}
                    </span>
                  </div>
                  {viewingSubmission.submission_data &&
                    typeof viewingSubmission.submission_data === 'object' &&
                    Object.keys(viewingSubmission.submission_data).filter(
                      key => !key.startsWith('_')
                    ).length > 0 && (
                      <div className='mt-3 pt-3 border-t border-gray-200'>
                        <div className='text-xs font-semibold text-gray-700 mb-2'>
                          表单数据：
                        </div>
                        <div className='space-y-1'>
                          {Object.entries(
                            viewingSubmission.submission_data
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
            </div>
          )}
        </ResponsiveDialog>

        {/* 添加/编辑嘉宾弹窗 */}
        <ResponsiveDialog
          isOpen={inviteeDialogOpen}
          onOpenChange={open => {
            setInviteeDialogOpen(open);
            if (!open) {
              setEditingInvitee(null);
              setInviteeName('');
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
                  value={inviteeName}
                  onChange={e => setInviteeName(e.target.value)}
                  placeholder='请输入嘉宾姓名'
                />
              </div>
              <div className='flex items-center gap-2 pt-2'>
                <Button
                  className='flex-1'
                  onClick={handleSubmitInvitee}
                  disabled={loading}
                >
                  {editingInvitee ? '保存' : '添加'}
                </Button>
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => setInviteeDialogOpen(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </ResponsiveDialog>

        {/* 分享设置面板 */}
        <ResponsiveDialog
          isOpen={shareDialogOpen}
          onOpenChange={open => {
            setShareDialogOpen(open);
            if (!open) {
              setCurrentShareInvitee(null);
              setShareTitle('');
            }
          }}
          title='分享设置'
        >
          <div className='px-4 pb-4'>
            <div className={styles.shareTypesWrap}>
              <div className={styles.title}>
                <span>分享标题</span>
              </div>
              <div className='mb-4'>
                <Input
                  value={shareTitle}
                  className={styles.input}
                  onChange={e => setShareTitle(e.target.value)}
                  placeholder='请输入分享标题'
                />
              </div>

              <div className={styles.title}>
                <Icon name='share' color='#09090B' size={16} />
                <span>分享方式</span>
              </div>
              <div className={styles.shareTypes}>
                {/* 微信好友 */}
                {isApp && !isOversea && !isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'rsvp_share_wechat_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
                    onClick={async () => {
                      if (executingKey) return;
                      setExecutingKey('wechat');
                      try {
                        await shareToWechat('wechat');
                      } finally {
                        setExecutingKey(null);
                      }
                    }}
                  >
                    <img
                      src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                      alt='微信'
                    />
                    <span>微信</span>
                  </BehaviorBox>
                )}

                {/* 小程序分享 */}
                {isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'rsvp_share_minip_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
                    onClick={() => showMiniPShareTip()}
                  >
                    <img
                      src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                      alt='分享'
                    />
                    <span>分享</span>
                  </BehaviorBox>
                )}

                {/* 复制链接 */}
                <BehaviorBox
                  behavior={{
                    object_type: 'rsvp_share_copy_link_btn',
                    object_id: worksId,
                  }}
                  className={styles.shareItem}
                  onClick={() => copyInviteeLink()}
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                    alt='复制链接'
                  />
                  <span>复制链接</span>
                </BehaviorBox>

                {/* 保存长图 */}
                {!isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'rsvp_share_poster_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
                    onClick={async () => {
                      if (executingKey) return;
                      setExecutingKey('poster');
                      try {
                        await savePoster();
                      } finally {
                        setExecutingKey(null);
                      }
                    }}
                  >
                    <img
                      src='https://res.maka.im/cdn/webstore10/jiantie/icon_poster.png'
                      alt='长图'
                    />
                    <span>保存长图</span>
                  </BehaviorBox>
                )}
              </div>
            </div>
          </div>
        </ResponsiveDialog>

        {/* 小程序分享提示 */}
        <ResponsiveDialog
          isDialog
          isOpen={showMiniPTip}
          onOpenChange={setShowMiniPTip}
          contentProps={{
            className: 'w-full bg-transparent top-[5%] translate-y-[0%]',
          }}
        >
          <div
            className={styles.shareOverlay}
            onClick={() => setShowMiniPTip(false)}
          >
            <img
              src='https://img2.maka.im/cdn/webstore10/jiantie/share_arrow.png'
              alt=''
              className={styles.arrow}
            />
            <div className={styles.tip}>
              点击右上角&quot;
              <div className={styles.icon}>
                <Icon name='more-ga3j8jod' />
              </div>
              &quot;进行分享哦
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
}
