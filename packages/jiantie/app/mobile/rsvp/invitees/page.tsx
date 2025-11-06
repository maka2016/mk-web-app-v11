'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getGuestCountText } from '@/components/RSVP/comp/SubmissionDataView';
import { InviteeDetailDialog } from '@/components/RSVP/InviteeDetailDialog';
import { parseRSVPFormFields, RSVPField } from '@/components/RSVP/type';
import { getUid } from '@/services';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ChevronRight, Globe, Target } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PublicShareDialog } from './PublicShareDialog';

export default function RSVPInviteesPage() {
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const [inviteeResponses, setInviteeResponses] = useState<any[]>([]);
  const [viewingInvitee, setViewingInvitee] = useState<any>(null);
  const [inviteeDetailOpen, setInviteeDetailOpen] = useState(false);
  const [responseFilter, setResponseFilter] = useState<
    'all' | 'responded' | 'not_responded'
  >('all');

  // 新增嘉宾相关状态
  const [inviteeDialogOpen, setInviteeDialogOpen] = useState(false);
  const [inviteeName, setInviteeName] = useState<string>('');
  const [creatingInvitee, setCreatingInvitee] = useState(false);

  // 套餐信息
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // 表单配置和字段
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formFields, setFormFields] = useState<RSVPField[]>([]);

  // 从表单配置中提取字段
  useEffect(() => {
    if (!formConfigId) return;
    const loadFormConfig = async () => {
      try {
        const config = (await trpc.rsvp.getFormConfigById.query({
          id: formConfigId,
        })) as any;
        setFormConfig(config);
        if (config?.form_fields) {
          const fields = parseRSVPFormFields(config.form_fields) as RSVPField[];
          setFormFields(fields);
        }
      } catch (error) {
        console.error('Failed to load form config:', error);
      }
    };
    loadFormConfig();
  }, [formConfigId]);

  // 分享面板相关状态
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'public' | 'invitee'>('public');
  const [shareContactId, setShareContactId] = useState<string | undefined>();
  const [shareContactName, setShareContactName] = useState<
    string | undefined
  >();
  const router = useRouter();

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

        // 创建成功后，打开分享页
        if (createdInvitee) {
          setShareMode('invitee');
          setShareContactId(createdInvitee.id);
          setShareContactName(createdInvitee.name);
          setShareDialogOpen(true);
        }
      } else {
        // 如果没有formConfigId，直接打开分享页
        if (createdInvitee) {
          setShareMode('invitee');
          setShareContactId(createdInvitee.id);
          setShareContactName(createdInvitee.name);
          setShareDialogOpen(true);
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
        const contactIds = allInvitees.map(invitee => invitee.id);
        let allSubmissions: any[] = [];
        try {
          allSubmissions = await trpc.rsvp.getSubmissionsByContactIds.query({
            contact_ids: contactIds,
          });
        } catch (error) {
          console.error('Failed to fetch submissions:', error);
        }

        // 按 contact_id 分组提交记录
        const submissionsByContactId = new Map<string, any[]>();
        allSubmissions.forEach(submission => {
          if (submission.contact_id) {
            const existing =
              submissionsByContactId.get(submission.contact_id) || [];
            existing.push(submission);
            submissionsByContactId.set(submission.contact_id, existing);
          }
        });

        // 处理所有提交记录，统计宾客数
        allInvitees.forEach(invitee => {
          if (!invitee || processedContacts.has(invitee.id)) return;

          const submissions = submissionsByContactId.get(invitee.id) || [];

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

    // 打开专属分享对话框
    setShareMode('invitee');
    setShareContactId(viewingInvitee.id);
    setShareContactName(viewingInvitee.name);
    setShareDialogOpen(true);
    setInviteeDetailOpen(false);
  };

  // 不再强制要求formConfigId，因为嘉宾归属于用户
  // 但需要worksId用于生成链接

  // 计算统计数据
  const totalCount = inviteeResponses.length;
  const respondedCount = inviteeResponses.filter(
    (item: any) => item.has_response
  ).length;

  // 回到首页
  const toHome = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'maka://home/activity/activityPage',
        type: 'NATIVE',
      });
    } else {
      router.push('/mobile/home');
    }
  };

  return (
    <div className='relative bg-gray-50'>
      <MobileHeader title={'分享与邀请'} rightText='' />

      <div className='p-3 overflow-y-auto flex flex-col gap-3'>
        {/* 指定嘉宾卡片 */}
        <div className='bg-white border border-gray-100 rounded-xl p-4 cursor-pointer shadow-sm'>
          <div
            className='flex items-center justify-between'
            onClick={handleOpenAddInvitee}
          >
            <div className='flex items-start gap-3 flex-1'>
              <div className='w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0'>
                <Target size={20} className='text-red-500' />
              </div>
              <div className='flex-1 flex flex-col justify-center'>
                <div className='flex items-center gap-2'>
                  <div className='font-semibold text-base text-[#09090B]'>
                    指定嘉宾
                  </div>
                  <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600'>
                    推荐
                  </span>
                </div>
                <div className='text-xs text-gray-600'>
                  向个别嘉宾发送带有专属链接的邀请。
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
                  生成公开链接，任何人都可以RSVP。
                </div>
              </div>
            </div>
            <ChevronRight
              size={20}
              className='text-gray-400 flex-shrink-0 ml-2'
            />
          </div>
        </div>

        {/* 邀请记录 */}
        <div className='border border-gray-100 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3'>
          <div className=''>
            <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
              已邀请嘉宾
            </div>
            <div className='text-sm text-gray-600'>
              共 {totalCount} 人 · {respondedCount} 人已响应
            </div>
          </div>

          {/* 分类标签 */}
          <div className='flex items-center gap-2'>
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

                // 从提交数据中提取人数信息（使用统一的函数）
                const submissionData = item.submission_data || {};
                const guestCountText = getGuestCountText(
                  submissionData,
                  formFields
                );

                // 获取最近活动时间
                const recentTime =
                  item.submission_create_time || item.create_time;

                return (
                  <div
                    key={item.id}
                    className='bg-white border border-[#e4e4e7] rounded-lg p-4 cursor-pointer hover:shadow-sm transition-all'
                    onClick={() => {
                      setViewingInvitee(item);
                      setInviteeDetailOpen(true);
                    }}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <div className='font-semibold text-sm leading-5 text-[#09090B] mb-2'>
                          {item.name || '未知嘉宾'}
                        </div>
                        <div className='flex items-center gap-2 mb-2'>
                          <span
                            className={`border-1 text-xs px-2 py-1 rounded-full font-medium ${statusColor} ${statusBgColor}`}
                          >
                            {statusText}
                          </span>
                          {/* 人数信息显示在状态标签同一行，参考图片样式 */}
                          {item.has_response &&
                            item.will_attend === true &&
                            guestCountText && (
                              <span className='text-xs text-gray-600'>
                                {guestCountText}
                              </span>
                            )}
                        </div>
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
                      <ChevronRight
                        size={20}
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
        <InviteeDetailDialog
          isOpen={inviteeDetailOpen}
          onOpenChange={setInviteeDetailOpen}
          invitee={viewingInvitee}
          formConfig={formConfig}
          onUpdate={async () => {
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
              const updated = data.find(
                (item: any) => item.id === viewingInvitee?.id
              );
              if (updated) {
                setViewingInvitee(updated);
              }
            }
          }}
          onShare={handleShareInvitee}
          showShareButton={true}
        />

        {/* 新增嘉宾弹窗 */}
        <ResponsiveDialog
          fullHeight={true}
          isOpen={inviteeDialogOpen}
          handleOnly={true}
          onOpenChange={open => {
            setInviteeDialogOpen(open);
            if (!open) {
              setInviteeName('');
            }
          }}
          title='指定嘉宾'
        >
          <div className='p-4 bg-gray-50 h-full border-t border-gray-200'>
            <div className='space-y-4'>
              {/* 套餐信息卡片，暂时不用 */}
              {/* <div className='bg-purple-50 rounded-xl border border-purple-200 p-4'>
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
              </div> */}

              {/* 创建嘉宾表单 */}
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
          </div>
        </ResponsiveDialog>

        {/* 分享面板 */}
        <PublicShareDialog
          isOpen={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          worksId={worksId}
          mode={shareMode}
          contactId={shareContactId}
          contactName={shareContactName}
        />
      </div>
    </div>
  );
}
