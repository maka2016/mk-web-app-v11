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
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from '../share.module.scss';

export default function RSVPInviteesManagePage() {
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const isOversea = getIsOverSeas();

  const [invitees, setInvitees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      // 创建嘉宾时不关联表单，分享时再关联
      await trpc.rsvp.createInvitee.mutate({
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
    toast.success('复制成功');
  };

  const handleShareInvitee = async (invitee: any) => {
    // 如果提供了form_config_id，先关联嘉宾和表单
    if (formConfigId) {
      try {
        await trpc.rsvp.linkInviteeToForm.mutate({
          contact_id: invitee.id,
          form_config_id: formConfigId,
        });
      } catch (error: any) {
        // 关联失败不影响打开分享面板（可能已经关联过了）
        console.warn('关联嘉宾到表单失败:', error);
      }
    }

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

    // 确保关联到表单（如果提供了form_config_id）
    if (formConfigId) {
      try {
        await trpc.rsvp.linkInviteeToForm.mutate({
          contact_id: currentShareInvitee.id,
          form_config_id: formConfigId,
        });
      } catch (error: any) {
        console.warn('关联嘉宾到表单失败:', error);
      }
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
  const copyInviteeLink = async () => {
    if (!currentShareInvitee) return;

    // 确保关联到表单（如果提供了form_config_id）
    if (formConfigId) {
      try {
        await trpc.rsvp.linkInviteeToForm.mutate({
          contact_id: currentShareInvitee.id,
          form_config_id: formConfigId,
        });
      } catch (error: any) {
        console.warn('关联嘉宾到表单失败:', error);
      }
    }

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

  return (
    <div className='relative bg-white'>
      <MobileHeader title={'嘉宾管理'} />

      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4'>
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
