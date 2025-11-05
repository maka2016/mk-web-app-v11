'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getUid } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Image as ImageIcon,
  Mail,
  Share,
  Target,
  Video,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './share.module.scss';

export default function RSVPInviteesPage() {
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const [inviteeResponses, setInviteeResponses] = useState<any[]>([]);
  const [viewingInvitee, setViewingInvitee] = useState<any>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseFilter, setResponseFilter] = useState<
    'all' | 'responded' | 'not_responded'
  >('all');

  // 新增嘉宾相关状态
  const [inviteeDialogOpen, setInviteeDialogOpen] = useState(false);
  const [inviteeName, setInviteeName] = useState<string>('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);

  // 套餐信息
  const [packageQuota, setPackageQuota] = useState<{
    total: number;
    used: number;
  }>({ total: 2500, used: 0 });

  // 统计宾客总数
  const calculateTotalGuests = (invitees: any[]): number => {
    let totalGuests = 0;

    invitees.forEach((invitee: any) => {
      const submissionData = invitee.submission_data || {};
      let guestCount = 0;
      let foundGuestCount = false;

      // 遍历提交数据，查找 guest_count 类型的字段
      for (const [key, value] of Object.entries(submissionData)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !key.startsWith('_')
        ) {
          // 如果支持大人小孩划分
          if ('adult' in value && 'child' in value) {
            const adult = (value as any).adult || 0;
            const child = (value as any).child || 0;
            guestCount = adult + child;
            foundGuestCount = true;
            break;
          }
          // 如果只有总数
          else if ('total' in value) {
            guestCount = (value as any).total || 0;
            foundGuestCount = true;
            break;
          }
        }
      }

      // 如果找到了人数字段，使用该人数
      if (foundGuestCount) {
        totalGuests += guestCount;
      }
      // 如果没有找到人数字段，但嘉宾已响应，默认算作1人（嘉宾本人）
      else if (invitee.has_response) {
        totalGuests += 1;
      }
      // 如果嘉宾未响应，不计入宾客数
    });

    return totalGuests;
  };

  // 嘉宾详情编辑相关状态
  const [editingPhone, setEditingPhone] = useState<string>('');
  const [editingAdultCount, setEditingAdultCount] = useState<number>(0);
  const [editingChildCount, setEditingChildCount] = useState<number>(0);
  const [isContactSectionExpanded, setIsContactSectionExpanded] =
    useState<boolean>(false);
  const [isUpdatingInvitee, setIsUpdatingInvitee] = useState(false);
  const [currentShareInvitee, setCurrentShareInvitee] = useState<any>(null);
  const [shareTitle, setShareTitle] = useState<string>('');
  const [inviteeShareDialogOpen, setInviteeShareDialogOpen] = useState(false);
  const [isApp, setIsApp] = useState(false);

  // 分享面板相关状态
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [executingKey, setExecutingKey] = useState<string | null>(null);

  // 公开分享的标题、描述和封面
  const [publicShareTitle, setPublicShareTitle] = useState<string>('');
  const [publicShareDesc, setPublicShareDesc] = useState<string>('');
  const [publicShareCover, setPublicShareCover] = useState<string>('');

  const { toPosterShare, toVideoShare } = useShareNavigation();

  // 生成公开链接
  const publicLink = useMemo(() => {
    if (typeof window === 'undefined' || !worksId) return '';
    const origin = window.location.origin;
    return `${origin}/viewer2/${worksId}`;
  }, [worksId]);

  // 初始化 APP 环境判断
  useEffect(() => {
    const initAPP = async () => {
      await APPBridge.init();
      setIsApp(APPBridge.judgeIsInApp());
      setIsMiniP(APPBridge.judgeIsInMiniP());
    };
    initAPP();
  }, []);

  // 当打开嘉宾详情时，初始化编辑数据
  useEffect(() => {
    if (viewingInvitee && responseDialogOpen) {
      setEditingPhone(viewingInvitee.phone || '');
      // 从提交数据中提取人数信息
      const submissionData = viewingInvitee.submission_data || {};
      let adultCount = 0;
      let childCount = 0;

      // 查找guest_count类型的字段
      for (const [key, value] of Object.entries(submissionData)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !key.startsWith('_')
        ) {
          if ('adult' in value && 'child' in value) {
            adultCount = (value as any).adult || 0;
            childCount = (value as any).child || 0;
            break;
          } else if ('total' in value) {
            adultCount = (value as any).total || 0;
            break;
          }
        }
      }

      setEditingAdultCount(adultCount);
      setEditingChildCount(childCount);
      setIsContactSectionExpanded(false);
    }
  }, [viewingInvitee, responseDialogOpen]);

  // 打开新增嘉宾弹窗
  const handleOpenAddInvitee = () => {
    setInviteeName('');
    setInviteeDialogOpen(true);
  };

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
          // 关联失败不影响创建成功，只记录警告
          console.warn('关联嘉宾到表单失败:', error);
        }
      }

      toast.success('创建成功');
      setInviteeDialogOpen(false);
      setInviteeName('');

      // 刷新邀请记录列表
      if (formConfigId) {
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          form_config_id: formConfigId,
        });
        setInviteeResponses(data || []);

        // 更新宾客总数统计
        const totalGuests = calculateTotalGuests(data || []);
        setPackageQuota(prev => ({
          ...prev,
          used: totalGuests,
        }));

        // 创建成功后，打开宾客详情弹窗
        if (createdInvitee) {
          const newInvitee = data.find(
            (item: any) => item.id === createdInvitee.id
          );
          if (newInvitee) {
            setViewingInvitee(newInvitee);
            setResponseDialogOpen(true);
          }
        }
      } else {
        // 如果没有formConfigId，也需要打开详情弹窗
        // 需要构造一个基本的invitee对象
        if (createdInvitee) {
          const basicInvitee = {
            id: createdInvitee.id,
            name: createdInvitee.name,
            email: createdInvitee.email || null,
            phone: createdInvitee.phone || null,
            create_time: createdInvitee.create_time,
            has_response: false,
            will_attend: null,
            submission_data: null,
            submission_create_time: null,
          };
          setViewingInvitee(basicInvitee);
          setResponseDialogOpen(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvitee(false);
    }
  };

  // 查询当前RSVP下的嘉宾响应状态
  useEffect(() => {
    const fetchInviteeResponses = async () => {
      if (!formConfigId) return;
      try {
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          form_config_id: formConfigId,
        });
        setInviteeResponses(data || []);
      } catch (error: any) {
        console.error('Failed to fetch invitee responses:', error);
        toast.error(error.message || '加载失败');
      }
    };
    fetchInviteeResponses();
  }, [formConfigId]);

  // 按用户uid统计所有RSVP的宾客总数
  useEffect(() => {
    const fetchUserInvitees = async () => {
      const uid = getUid();
      if (!uid) return;

      try {
        // 查询用户的所有嘉宾（不限定form_config_id）
        const allInvitees = await trpc.rsvp.listInvitees.query({});

        if (!allInvitees || allInvitees.length === 0) {
          setPackageQuota(prev => ({
            ...prev,
            used: 0,
          }));
          return;
        }

        // 对于每个嘉宾，查询他们的所有提交记录
        let totalGuests = 0;
        const processedContacts = new Set<string>();

        // 批量查询所有嘉宾的提交记录
        const allSubmissionsArrays: any[][] = [];
        for (const invitee of allInvitees) {
          try {
            const submissions = await trpc.rsvp.getSubmissionsByContactId.query(
              {
                contact_id: invitee.id,
              }
            );
            allSubmissionsArrays.push(submissions as any[]);
          } catch {
            allSubmissionsArrays.push([]);
          }
        }

        // 处理所有提交记录，统计宾客数
        allSubmissionsArrays.forEach((submissions, index) => {
          const invitee = allInvitees[index];
          if (!invitee || processedContacts.has(invitee.id)) return;

          // 找到每个表单的最新提交记录
          const submissionsByForm = new Map<string, any>();
          submissions.forEach((submission: any) => {
            const formId = submission.form_config_id;
            if (!submissionsByForm.has(formId)) {
              submissionsByForm.set(formId, submission);
            } else {
              const existing = submissionsByForm.get(formId);
              if (
                new Date(submission.create_time) >
                new Date(existing.create_time)
              ) {
                submissionsByForm.set(formId, submission);
              }
            }
          });

          // 统计该嘉宾在所有表单中的宾客数
          submissionsByForm.forEach((submission: any) => {
            const submissionData = submission.submission_data || {};
            let guestCount = 0;
            let foundGuestCount = false;

            // 查找 guest_count 类型的字段
            for (const [key, value] of Object.entries(submissionData)) {
              if (
                typeof value === 'object' &&
                value !== null &&
                !key.startsWith('_')
              ) {
                if ('adult' in value && 'child' in value) {
                  const adult = (value as any).adult || 0;
                  const child = (value as any).child || 0;
                  guestCount = adult + child;
                  foundGuestCount = true;
                  break;
                } else if ('total' in value) {
                  guestCount = (value as any).total || 0;
                  foundGuestCount = true;
                  break;
                }
              }
            }

            // 如果找到了人数字段，使用该人数
            if (foundGuestCount) {
              totalGuests += guestCount;
            } else {
              // 如果没有找到人数字段，默认算作1人（嘉宾本人）
              totalGuests += 1;
            }
          });

          processedContacts.add(invitee.id);
        });

        setPackageQuota(prev => ({
          ...prev,
          used: totalGuests,
        }));
      } catch (error: any) {
        console.error('Failed to fetch user invitees:', error);
      }
    };

    fetchUserInvitees();
  }, []);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('复制成功');
  };

  // 保存长图
  const savePoster = async () => {
    if (!worksId) return;
    toPosterShare(worksId);
  };

  // 导出视频
  const exportVideo = async () => {
    if (!worksId) return;
    toVideoShare(worksId);
  };

  // 获取作品信息
  useEffect(() => {
    const fetchWorkInfo = async () => {
      if (!worksId) return;
      try {
        const res = (await getWorkData2(worksId)) as any;
        const detail = res?.detail;
        if (detail) {
          setPublicShareTitle(detail.title || '');
          setPublicShareDesc(detail.desc || '');
          setPublicShareCover(detail.cover || '');
        }
      } catch (error) {
        console.error('获取作品信息失败:', error);
      }
    };
    if (shareDialogOpen) {
      fetchWorkInfo();
    }
  }, [worksId, shareDialogOpen]);

  // 更新作品标题
  const updateWorkTitle = async (title: string) => {
    if (!worksId) return;
    try {
      await updateWorksDetail2(worksId, {
        title,
        is_title_desc_modified: true,
      } as any);
    } catch (error) {
      console.error('更新标题失败:', error);
    }
  };

  // 更新作品描述
  const updateWorkDesc = async (desc: string) => {
    if (!worksId) return;
    try {
      await updateWorksDetail2(worksId, {
        desc,
        is_title_desc_modified: true,
      } as any);
    } catch (error) {
      console.error('更新描述失败:', error);
    }
  };

  // 生成嘉宾专属链接
  const generateInviteeLink = (invitee: any) => {
    const params = new URLSearchParams();
    params.set('rsvp_invitee', invitee.name);
    params.set('rsvp_contact_id', invitee.id);
    return `${window.location.origin}/viewer2/${worksId}?${params.toString()}`;
  };

  // 更新嘉宾信息
  const handleUpdateInviteeInfo = async () => {
    if (!viewingInvitee) return;

    setIsUpdatingInvitee(true);
    try {
      // 更新嘉宾基本信息（电话）
      await trpc.rsvp.updateInvitee.mutate({
        id: viewingInvitee.id,
        phone: editingPhone.trim() || undefined,
      });

      // 如果有提交记录，需要更新提交数据中的人数信息
      // 这里需要查询最新的提交记录来更新
      if (viewingInvitee.has_response && formConfigId) {
        // 获取提交记录
        const submissions = await trpc.rsvp.getInviteeSubmissions.query({
          contact_id: viewingInvitee.id,
          form_config_id: formConfigId,
        });

        if (submissions && submissions.length > 0) {
          const latestSubmission = submissions[0];
          const submissionData = { ...latestSubmission.submission_data };

          // 更新人数字段（查找guest_count类型字段）
          let updated = false;
          for (const [key, value] of Object.entries(submissionData)) {
            if (
              typeof value === 'object' &&
              value !== null &&
              !key.startsWith('_')
            ) {
              if ('adult' in value || 'child' in value || 'total' in value) {
                // 找到人数字段，更新它
                if ('adult' in value && 'child' in value) {
                  submissionData[key] = {
                    adult: editingAdultCount,
                    child: editingChildCount,
                  };
                } else if ('total' in value) {
                  submissionData[key] = {
                    total: editingAdultCount + editingChildCount,
                  };
                }
                updated = true;
                break;
              }
            }
          }

          // 如果有更新，提交新版本
          if (updated) {
            await trpc.rsvp.updateSubmissionVersion.mutate({
              submission_group_id: latestSubmission.submission_group_id,
              submission_data: submissionData,
              operator_type: 'admin',
              operator_name: '管理员',
            });
          }
        }
      }

      toast.success('更新成功');
      // 刷新数据
      if (formConfigId) {
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          form_config_id: formConfigId,
        });
        setInviteeResponses(data || []);

        // 更新宾客总数统计
        const totalGuests = calculateTotalGuests(data || []);
        setPackageQuota(prev => ({
          ...prev,
          used: totalGuests,
        }));

        // 更新当前查看的嘉宾信息
        const updated = data.find((item: any) => item.id === viewingInvitee.id);
        if (updated) {
          setViewingInvitee(updated);
        }
      }
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    } finally {
      setIsUpdatingInvitee(false);
    }
  };

  // 分享嘉宾邀请
  const handleShareInvitee = async () => {
    if (!viewingInvitee) return;

    // 确保关联到表单（如果提供了form_config_id）
    if (formConfigId) {
      try {
        await trpc.rsvp.linkInviteeToForm.mutate({
          contact_id: viewingInvitee.id,
          form_config_id: formConfigId,
        });
      } catch (error: any) {
        console.warn('关联嘉宾到表单失败:', error);
      }
    }

    setCurrentShareInvitee(viewingInvitee);
    setShareTitle(`邀请 ${viewingInvitee.name} 参加活动`);
    setInviteeShareDialogOpen(true);
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
  const copyInviteeLink = async () => {
    if (!currentShareInvitee) return;

    const shareLink = generateInviteeLink(currentShareInvitee);
    handleCopyLink(shareLink);
  };

  // 不再强制要求formConfigId，因为嘉宾归属于用户
  // 但需要worksId用于生成链接

  // 计算统计数据
  const totalCount = inviteeResponses.length;
  const respondedCount = inviteeResponses.filter(
    (item: any) => item.has_response
  ).length;

  return (
    <div className='relative bg-gray-50'>
      <MobileHeader title={'分享与邀请'} />

      <div className='px-4 py-3 overflow-y-auto flex flex-col gap-4'>
        {/* 指定嘉宾卡片 */}
        <div className='bg-white border border-[#e4e4e7] rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all'>
          <div
            className='flex items-start justify-between'
            onClick={handleOpenAddInvitee}
          >
            <div className='flex items-start gap-3 flex-1'>
              <div className='w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0'>
                <Target size={20} className='text-red-500' />
              </div>
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-1'>
                  <div className='font-semibold text-base text-[#09090B]'>
                    指定嘉宾
                  </div>
                  <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600'>
                    推荐
                  </span>
                </div>
                <div className='text-sm text-gray-600'>
                  向个别嘉宾发送带有专属链接的邀请。
                </div>
              </div>
            </div>
            <ArrowRight
              size={20}
              className='text-gray-400 flex-shrink-0 ml-2'
            />
          </div>
        </div>

        {/* 公开分享卡片 */}
        <div className='bg-white border border-[#e4e4e7] rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all'>
          <div
            className='flex items-start justify-between'
            onClick={() => {
              setShareDialogOpen(true);
            }}
          >
            <div className='flex items-start gap-3 flex-1'>
              <div className='w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0'>
                <Globe size={20} className='text-blue-500' />
              </div>
              <div className='flex-1'>
                <div className='font-semibold text-base text-[#09090B] mb-1'>
                  公开分享
                </div>
                <div className='text-sm text-gray-600'>
                  生成公开链接，任何人都可以RSVP。
                </div>
              </div>
            </div>
            <ArrowRight
              size={20}
              className='text-gray-400 flex-shrink-0 ml-2'
            />
          </div>
        </div>

        {/* 邀请记录 */}
        <div className='border border-black/[0.1] rounded-xl p-3 bg-white'>
          <div className='mb-3'>
            <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
              已邀请嘉宾
            </div>
            <div className='text-sm text-gray-600'>
              共 {totalCount} 人 · {respondedCount} 人已响应
            </div>
          </div>

          {/* 分类标签 */}
          <div className='flex items-center gap-2 mb-3'>
            <Button
              size='sm'
              variant={responseFilter === 'all' ? 'default' : 'outline'}
              className={
                responseFilter === 'all'
                  ? 'bg-[#09090B] text-white hover:bg-[#09090B]/90'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              onClick={() => setResponseFilter('all')}
            >
              全部
            </Button>
            <Button
              size='sm'
              variant={
                responseFilter === 'not_responded' ? 'default' : 'outline'
              }
              className={
                responseFilter === 'not_responded'
                  ? 'bg-[#09090B] text-white hover:bg-[#09090B]/90'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              onClick={() => setResponseFilter('not_responded')}
            >
              未响应
            </Button>
            <Button
              size='sm'
              variant={responseFilter === 'responded' ? 'default' : 'outline'}
              className={
                responseFilter === 'responded'
                  ? 'bg-[#09090B] text-white hover:bg-[#09090B]/90'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              onClick={() => setResponseFilter('responded')}
            >
              已响应
            </Button>
          </div>

          {/* 筛选后的记录列表 */}
          <div className='space-y-3'>
            {(() => {
              // 根据筛选条件过滤记录
              const filteredResponses = inviteeResponses.filter((item: any) => {
                if (responseFilter === 'all') return true;
                if (responseFilter === 'responded')
                  return item.has_response === true;
                if (responseFilter === 'not_responded')
                  return item.has_response === false;
                return true;
              });

              if (filteredResponses.length === 0) {
                return (
                  <div className='text-sm text-gray-500 text-center py-4'>
                    暂无记录
                  </div>
                );
              }

              return filteredResponses.map((item: any) => {
                // 状态文本和颜色
                let statusText = '不出席';
                let statusColor = 'text-gray-600';
                let statusBgColor = 'bg-gray-100';

                if (!item.has_response) {
                  statusText = '未响应';
                  statusColor = 'text-gray-600';
                  statusBgColor = 'bg-gray-100';
                } else if (item.will_attend === true) {
                  statusText = '出席';
                  statusColor = 'text-green-600';
                  statusBgColor = 'bg-green-100';
                } else if (item.will_attend === false) {
                  statusText = '不出席';
                  statusColor = 'text-gray-600';
                  statusBgColor = 'bg-gray-100';
                } else {
                  statusText = '已响应';
                  statusColor = 'text-blue-600';
                  statusBgColor = 'bg-blue-100';
                }

                // 从提交数据中提取人数信息
                const submissionData = item.submission_data || {};
                let adultCount = 0;
                let childCount = 0;

                for (const [key, value] of Object.entries(submissionData)) {
                  if (
                    typeof value === 'object' &&
                    value !== null &&
                    !key.startsWith('_')
                  ) {
                    if ('adult' in value && 'child' in value) {
                      adultCount = (value as any).adult || 0;
                      childCount = (value as any).child || 0;
                      break;
                    } else if ('total' in value) {
                      adultCount = (value as any).total || 0;
                      break;
                    }
                  }
                }

                // 获取最近活动时间
                const recentTime =
                  item.submission_create_time || item.create_time;

                return (
                  <div
                    key={item.id}
                    className='bg-white border border-[#e4e4e7] rounded-lg p-4 cursor-pointer hover:shadow-sm transition-all'
                    onClick={() => {
                      setViewingInvitee(item);
                      setResponseDialogOpen(true);
                    }}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='font-semibold text-sm leading-5 text-[#09090B] mb-2'>
                          {item.name || '未知嘉宾'}
                        </div>
                        <div className='flex items-center gap-2 mb-2'>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor} ${statusBgColor}`}
                          >
                            {statusText}
                          </span>
                        </div>
                        {(adultCount > 0 || childCount > 0) && (
                          <div className='text-xs text-gray-600 mb-1'>
                            成人 {adultCount} · 儿童 {childCount}
                          </div>
                        )}
                        {recentTime && (
                          <div className='text-xs text-gray-400'>
                            最近：{' '}
                            {(() => {
                              const date = new Date(recentTime);
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, '0');
                              const day = String(date.getDate()).padStart(
                                2,
                                '0'
                              );
                              const hours = String(date.getHours()).padStart(
                                2,
                                '0'
                              );
                              const minutes = String(
                                date.getMinutes()
                              ).padStart(2, '0');
                              const seconds = String(
                                date.getSeconds()
                              ).padStart(2, '0');
                              return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
                            })()}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        size={16}
                        className='text-gray-400 flex-shrink-0 ml-2'
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* 嘉宾详情弹窗 */}
        <ResponsiveDialog
          isOpen={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          title='嘉宾详情'
        >
          {viewingInvitee && (
            <div className='p-4 max-h-[80vh] overflow-y-auto'>
              {/* 基本信息卡片 */}
              <div className='bg-white border border-[#e4e4e7] rounded-xl p-4 mb-4'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1'>
                    <div className='font-semibold text-base text-[#09090B] mb-1'>
                      {viewingInvitee.name || '未知嘉宾'}
                    </div>
                    <div className='text-sm text-gray-600'>
                      成人 {editingAdultCount} · 儿童 {editingChildCount}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      viewingInvitee.has_response
                        ? viewingInvitee.will_attend === true
                          ? 'bg-green-50 text-green-600'
                          : viewingInvitee.will_attend === false
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {viewingInvitee.has_response
                      ? viewingInvitee.will_attend === true
                        ? '已确认出席'
                        : viewingInvitee.will_attend === false
                          ? '已确认不出席'
                          : '已响应'
                      : '未响应'}
                  </span>
                </div>
              </div>

              {/* 分享专属邀请卡片 */}
              <div className='bg-white border border-[#e4e4e7] rounded-xl p-4 mb-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Mail size={16} className='text-gray-600' />
                  <div className='font-semibold text-base text-[#09090B]'>
                    分享专属邀请
                  </div>
                </div>
                <div className='text-sm text-gray-600 mb-3'>
                  通过微信分享活动链接给嘉宾
                </div>
                <Button
                  className='w-full bg-green-500 hover:bg-green-600 text-white h-10'
                  onClick={handleShareInvitee}
                >
                  <Share size={16} className='mr-2' />
                  立即发送
                </Button>
              </div>

              {/* 联系方式和附加信息卡片 */}
              <div className='bg-white border border-[#e4e4e7] rounded-xl p-4 mb-4'>
                <div
                  className={`flex items-center justify-between mb-3 ${
                    viewingInvitee.has_response ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (viewingInvitee.has_response) {
                      setIsContactSectionExpanded(!isContactSectionExpanded);
                    }
                  }}
                >
                  <div className='font-semibold text-base text-[#09090B]'>
                    联系方式和附加信息
                  </div>
                  {viewingInvitee.has_response && (
                    <>
                      {isContactSectionExpanded ? (
                        <ChevronUp size={20} className='text-gray-400' />
                      ) : (
                        <ChevronDown size={20} className='text-gray-400' />
                      )}
                    </>
                  )}
                </div>

                {viewingInvitee.has_response ? (
                  isContactSectionExpanded && (
                    <div className='space-y-4 pt-2'>
                      <div>
                        <div className='text-sm text-gray-600 mb-1'>
                          手机号码
                        </div>
                        <Input
                          className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm'
                          value={editingPhone}
                          onChange={e => setEditingPhone(e.target.value)}
                          placeholder='可选'
                        />
                      </div>

                      <div>
                        <div className='text-sm text-gray-600 mb-1'>人数</div>
                        <div className='flex items-center gap-3'>
                          <div className='flex-1'>
                            <div className='text-xs text-gray-500 mb-1'>
                              成人
                            </div>
                            <Input
                              type='number'
                              min='0'
                              className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm'
                              value={editingAdultCount}
                              onChange={e =>
                                setEditingAdultCount(
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <div className='flex-1'>
                            <div className='text-xs text-gray-500 mb-1'>
                              儿童
                            </div>
                            <Input
                              type='number'
                              min='0'
                              className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm'
                              value={editingChildCount}
                              onChange={e =>
                                setEditingChildCount(
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        className='w-full'
                        onClick={handleUpdateInviteeInfo}
                        disabled={isUpdatingInvitee}
                      >
                        {isUpdatingInvitee ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className='text-sm text-gray-500 text-center py-4'>
                    暂无联系方式和附加信息
                  </div>
                )}
              </div>

              {/* 交互记录卡片 */}
              <div className='bg-white border border-[#e4e4e7] rounded-xl p-4'>
                <div className='font-semibold text-base text-[#09090B] mb-3'>
                  交互记录
                </div>
                <div className='space-y-3'>
                  {viewingInvitee.has_response && (
                    <div className='flex items-center gap-3'>
                      <Mail size={16} className='text-gray-400' />
                      <div className='flex-1'>
                        <div className='text-sm text-gray-800'>创建邀请</div>
                        <div className='text-xs text-gray-400'>
                          {new Date(
                            viewingInvitee.submission_create_time ||
                              viewingInvitee.create_time
                          ).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {!viewingInvitee.has_response && (
                    <div className='text-sm text-gray-500 text-center py-2'>
                      暂无交互记录
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        {/* 嘉宾分享设置面板 */}
        <ResponsiveDialog
          isOpen={inviteeShareDialogOpen}
          onOpenChange={setInviteeShareDialogOpen}
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
                <Share size={16} color='#09090B' />
                <span>分享方式</span>
              </div>
              <div className={styles.shareTypes}>
                {/* 微信好友 */}
                {isApp && !isMiniP && (
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
                        setInviteeShareDialogOpen(false);
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

                {/* 复制链接 */}
                <BehaviorBox
                  behavior={{
                    object_type: 'rsvp_share_copy_link_btn',
                    object_id: worksId,
                  }}
                  className={styles.shareItem}
                  onClick={() => {
                    copyInviteeLink();
                    setInviteeShareDialogOpen(false);
                  }}
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                    alt='复制链接'
                  />
                  <span>复制链接</span>
                </BehaviorBox>
              </div>
            </div>
          </div>
        </ResponsiveDialog>

        {/* 新增嘉宾弹窗 */}
        <ResponsiveDialog
          isOpen={inviteeDialogOpen}
          onOpenChange={open => {
            setInviteeDialogOpen(open);
            if (!open) {
              setInviteeName('');
            }
          }}
          title='指定嘉宾'
        >
          <div className='p-4'>
            <div className='space-y-4'>
              {/* 套餐信息卡片 */}
              <div className='bg-purple-50 rounded-xl border border-purple-200 p-4'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-start gap-3 flex-1'>
                    <div className='w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0'>
                      <Target size={20} className='text-red-500' />
                    </div>
                    <div className='flex-1'>
                      <div className='text-sm font-semibold text-[#09090B] mb-1'>
                        当前套餐：{packageQuota.total} 位嘉宾
                      </div>
                      <div className='text-xs text-gray-600'>
                        已使用 {packageQuota.used} / {packageQuota.total}
                      </div>
                    </div>
                  </div>
                  <Button
                    size='sm'
                    className='bg-purple-500 hover:bg-purple-600 text-white px-4'
                    onClick={() => {
                      toast('升级功能开发中');
                    }}
                  >
                    升级
                  </Button>
                </div>
              </div>

              {/* 创建嘉宾表单 */}
              <div className='bg-white rounded-xl border border-[#e4e4e7] p-4'>
                <div className='text-base font-semibold text-[#09090B] mb-4'>
                  创建嘉宾
                </div>

                <div className='mb-4'>
                  <div className='text-sm font-medium text-[#0A0A0A] mb-2'>
                    姓名（必填）
                  </div>
                  <Input
                    className='w-full bg-[#F3F3F5] border border-gray-200 rounded-md px-3 py-2 text-sm'
                    value={inviteeName}
                    onChange={e => setInviteeName(e.target.value)}
                    placeholder='例如：王小明'
                  />
                </div>

                <Button
                  className='w-full bg-gray-800 hover:bg-gray-900 text-white h-12 text-base font-medium'
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
          </div>
        </ResponsiveDialog>

        {/* 分享设置面板 - 用于公开链接分享 */}
        <ResponsiveDialog
          isOpen={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title='分享邀请链接'
        >
          <div className='px-4 pb-4 space-y-4'>
            {/* 编辑标题、描述和封面 */}
            <div className='bg-white rounded-xl border border-[#e4e4e7] p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className={styles.title}>
                  <span>编辑标题、描述和封面</span>
                </div>
                <span className='text-sm text-blue-500 cursor-pointer'>
                  自动
                </span>
              </div>

              {/* 标题输入 */}
              <div className='mb-3'>
                <div className='relative'>
                  <Input
                    value={publicShareTitle}
                    onChange={e => setPublicShareTitle(e.target.value)}
                    onBlur={() => updateWorkTitle(publicShareTitle)}
                    className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm'
                    placeholder='请输入标题'
                    maxLength={36}
                  />
                  <div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                    {publicShareTitle.length}/36
                  </div>
                </div>
              </div>

              {/* 封面和描述 */}
              <div className='flex gap-3'>
                {/* 封面 */}
                <div className='relative flex-shrink-0'>
                  <div className='w-24 h-24 rounded-lg bg-gray-200 overflow-hidden'>
                    {publicShareCover ? (
                      <img
                        src={publicShareCover}
                        alt='封面'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-xs text-gray-400'>
                        封面
                      </div>
                    )}
                  </div>
                  <div
                    className='absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 rounded-b-lg cursor-pointer'
                    onClick={() => {
                      toast('封面更换功能开发中');
                    }}
                  >
                    更换封面
                  </div>
                </div>

                {/* 描述 */}
                <div className='flex-1 relative'>
                  <Textarea
                    value={publicShareDesc}
                    onChange={e => setPublicShareDesc(e.target.value)}
                    onBlur={() => updateWorkDesc(publicShareDesc)}
                    className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-sm min-h-[96px] resize-none'
                    placeholder='请输入描述'
                    maxLength={60}
                  />
                  <div className='absolute bottom-2 right-2 text-xs text-gray-400'>
                    {publicShareDesc.length}/60
                  </div>
                </div>
              </div>
            </div>

            {/* 导出其他格式 */}
            <div className='bg-white rounded-xl border border-[#e4e4e7] p-4'>
              <div className={styles.title}>
                <span>导出其他格式</span>
              </div>
              <div className={styles.shareTypes}>
                {/* 图片 */}
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
                    <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center'>
                      <ImageIcon size={20} className='text-gray-600' />
                    </div>
                    <span>图片</span>
                  </BehaviorBox>
                )}

                {/* 视频 */}
                {!isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'rsvp_share_video_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
                    onClick={async () => {
                      if (executingKey) return;
                      setExecutingKey('video');
                      try {
                        await exportVideo();
                      } finally {
                        setExecutingKey(null);
                      }
                    }}
                  >
                    <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center'>
                      <Video size={20} className='text-gray-600' />
                    </div>
                    <span>视频</span>
                  </BehaviorBox>
                )}

                {/* 复制链接 */}
                <BehaviorBox
                  behavior={{
                    object_type: 'rsvp_share_copy_link_btn',
                    object_id: worksId,
                  }}
                  className={styles.shareItem}
                  onClick={() => {
                    if (publicLink) {
                      handleCopyLink(publicLink);
                    }
                  }}
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                    alt='复制链接'
                  />
                  <span>复制链接</span>
                </BehaviorBox>
              </div>
            </div>

            {/* 分享专属邀请 */}
            <div className='bg-white rounded-xl border border-[#e4e4e7] p-4'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0'>
                  <Share size={12} className='text-white' />
                </div>
                <div className={styles.title}>
                  <span>分享专属邀请</span>
                </div>
              </div>
              <div className='text-sm text-gray-600 mb-3'>
                通过微信向嘉宾分享活动链接
              </div>
              <Button
                className='w-full bg-green-500 hover:bg-green-600 text-white h-10'
                onClick={() => {
                  // 这里可以添加分享到微信的逻辑
                  toast('请在微信中打开进行分享');
                }}
              >
                <div className='flex items-center justify-center gap-2'>
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                    alt='微信'
                    className='w-5 h-5'
                  />
                  <span>立即发送</span>
                </div>
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
}
