'use client';
import { getGuestCountText } from '@/components/RSVP/comp/SubmissionDataView';
import { parseRSVPFormFields, RSVPField } from '@/components/RSVP/type';
import { getUid } from '@/services';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { Button } from '@workspace/ui/components/button';
import { ChevronRight, Globe, Target } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../RSVPLayoutContext';

export default function RSVPInviteesPage() {
  const { setTitle, setRightText, setRightContent, setOnRightClick } =
    useRSVPLayout();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  // 设置页面标题
  useEffect(() => {
    setTitle('分享与邀请');
    setRightContent(null);
    setRightText('回首页');

    const openManagePage = () => {
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: 'maka://home/activity/activityPage?default_tab=1',
          type: 'NATIVE',
        });
      } else {
        router.replace('/mobile/home');
      }
    };

    setOnRightClick(() => openManagePage);

    return () => {
      setRightText('');
      setRightContent(null);
      setOnRightClick(undefined);
    };
  }, [
    formConfigId,
    router,
    setOnRightClick,
    setRightContent,
    setRightText,
    setTitle,
    worksId,
  ]);

  const [inviteeResponses, setInviteeResponses] = useState<any[]>([]);
  const [responseFilter, setResponseFilter] = useState<
    'all' | 'responded' | 'not_responded'
  >('all');

  // 套餐信息
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [packageQuota, setPackageQuota] = useState<{
    total: number;
    used: number;
  }>({ total: 2500, used: 0 });

  // 表单字段
  const [formFields, setFormFields] = useState<RSVPField[]>([]);

  // 从表单配置中提取字段
  useEffect(() => {
    if (!formConfigId) return;
    const loadFormConfig = async () => {
      try {
        const config = (await trpc.rsvp.getFormConfigById.query({
          id: formConfigId,
        })) as any;
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

  // 跳转到创建嘉宾页面
  const handleOpenAddInvitee = () => {
    const createUrl = `/mobile/rsvp/invitees/create?works_id=${worksId}&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${createUrl}`,
        type: 'URL',
      });
    } else {
      router.push(createUrl);
    }
  };

  // 跳转到公开分享页面
  const handleOpenPublicShare = () => {
    const shareUrl = `/mobile/rsvp/share?works_id=${worksId}&mode=public&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${shareUrl}`,
        type: 'URL',
      });
    } else {
      router.push(shareUrl);
    }
  };

  // 跳转到嘉宾详情页面
  const handleOpenInviteeDetail = (invitee: any) => {
    const detailUrl = `/mobile/rsvp/invitees/${invitee.id}?works_id=${worksId}&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${detailUrl}`,
        type: 'URL',
      });
    } else {
      router.push(detailUrl);
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

  // 计算统计数据
  const totalCount = inviteeResponses.length;
  const respondedCount = inviteeResponses.filter(
    (item: any) => item.has_response
  ).length;

  return (
    <div className='p-3 flex flex-col gap-3'>
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
          onClick={handleOpenPublicShare}
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
            variant={responseFilter === 'not_responded' ? 'default' : 'outline'}
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
                  onClick={() => handleOpenInviteeDetail(item)}
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
                            const month = String(date.getMonth() + 1).padStart(
                              2,
                              '0'
                            );
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(
                              2,
                              '0'
                            );
                            const minutes = String(date.getMinutes()).padStart(
                              2,
                              '0'
                            );
                            const seconds = String(date.getSeconds()).padStart(
                              2,
                              '0'
                            );
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
    </div>
  );
}
