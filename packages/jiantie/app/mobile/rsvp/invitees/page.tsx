'use client';
import { getGuestCountText } from '@/components/RSVP/comp/SubmissionDataView';
import { parseRSVPFormFields, RSVPField } from '@/components/RSVP/type';
import { getUid } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ChevronRight, Download, Globe, Target } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../RSVPLayoutContext';

export default function RSVPInviteesPage() {
  const { setTitle, setRightText, setRightContent, setOnRightClick } =
    useRSVPLayout();
  const router = useRouter();
  const nav = useStore();
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id') || '';

  const [loading, setLoading] = useState<boolean>(false);

  // 设置页面标题
  useEffect(() => {
    setTitle('分享与邀请');
    setRightContent(null);
    setRightText('回首页');

    const openManagePage = () => {
      nav.toHome();
    };

    setOnRightClick(() => openManagePage);

    return () => {
      setRightText('');
      setRightContent(null);
      setOnRightClick(undefined);
    };
  }, [router, setOnRightClick, setRightContent, setRightText, setTitle]);

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

  // 表单字段（用于显示，可选）
  const [formFields, setFormFields] = useState<RSVPField[]>([]);

  // 通过 works_id 获取表单配置（仅用于获取表单字段，不是必需的）
  useEffect(() => {
    if (!worksId) return;
    const loadFormConfig = async () => {
      try {
        const config = (await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: worksId,
        })) as any;

        if (config && config.form_fields) {
          const fields = parseRSVPFormFields(config.form_fields) as RSVPField[];
          setFormFields(fields);
        }
      } catch (error) {
        // 如果没有表单配置，不影响嘉宾管理功能
        console.warn('Failed to load form config:', error);
      }
    };
    loadFormConfig();
  }, [worksId]);

  // 跳转到创建嘉宾页面
  const handleOpenAddInvitee = () => {
    const createUrl = `/mobile/rsvp/invitees/create?works_id=${worksId}`;
    navigateWithBridge({ path: createUrl, router });
  };

  // 跳转到公开分享页面
  const handleOpenPublicShare = () => {
    const shareUrl = `/mobile/rsvp/share?works_id=${worksId}&mode=public`;
    navigateWithBridge({ path: shareUrl, router });
  };

  // 跳转到嘉宾详情页面
  const handleOpenInviteeDetail = (invitee: any) => {
    const detailUrl = `/mobile/rsvp/invitees/${invitee.id}?works_id=${worksId}`;
    navigateWithBridge({ path: detailUrl, router });
  };

  // 查询当前作品下的嘉宾响应状态
  useEffect(() => {
    const fetchInviteeResponses = async () => {
      if (!worksId) return;
      try {
        setLoading(true);
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          works_id: worksId,
        });
        setInviteeResponses(data || []);
      } catch (error: any) {
        console.error('Failed to fetch invitee responses:', error);
        toast.error(error.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchInviteeResponses();
  }, [worksId]);

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

  // 获取字段显示值（用于CSV导出）
  const getFieldDisplayValue = (
    field: RSVPField,
    submissionData: Record<string, any>
  ): string => {
    const value = submissionData[field.id];
    if (value === undefined || value === null || value === '') {
      return '';
    }

    if (field.type === 'checkbox') {
      const selectedValues = Array.isArray(value) ? value : [];
      if (selectedValues.length === 0) return '';

      return selectedValues
        .map(val => {
          const option = field.options?.find(opt => opt.value === val);
          return option?.label || val;
        })
        .join('、');
    } else if (field.type === 'radio') {
      const option = field.options?.find(opt => opt.value === value);
      return option?.label || String(value);
    } else if (field.type === 'guest_count') {
      if (typeof value === 'object' && value !== null) {
        if (field.splitAdultChild) {
          const adult = (value as any).adult || 0;
          const child = (value as any).child || 0;
          if (adult === 0 && child === 0) return '';
          return `成人 ${adult} · 儿童 ${child}`;
        } else {
          const total = (value as any).total || 0;
          return total > 0 ? `共 ${total} 人` : '';
        }
      }
      return '';
    } else {
      return String(value);
    }
  };

  // CSV转义函数
  const escapeCsvField = (field: string): string => {
    if (!field) return '';
    // 如果包含逗号、引号或换行符，需要用引号包裹，并转义内部引号
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '';
    }
  };

  // 导出CSV
  const handleExportCSV = () => {
    try {
      // 获取筛选后的数据
      const filteredResponses = inviteeResponses.filter((item: any) => {
        if (responseFilter === 'all') return true;
        if (responseFilter === 'responded') return item.has_response === true;
        if (responseFilter === 'not_responded')
          return item.has_response === false;
        return true;
      });

      if (filteredResponses.length === 0) {
        toast.error('没有可导出的数据');
        return;
      }

      // 构建表头
      const headers = [
        '姓名',
        '状态',
        '响应状态',
        '是否出席',
        '人数',
        '最近活动时间',
      ];

      // 添加表单字段作为列（排除guest_count，因为已经单独作为"人数"列）
      const formFieldsForExport = formFields.filter(
        f => f.enabled !== false && f.type !== 'guest_count'
      );
      formFieldsForExport.forEach(field => {
        headers.push(field.label);
      });

      // 构建CSV内容
      const rows: string[] = [];
      rows.push(headers.map(escapeCsvField).join(','));

      filteredResponses.forEach((item: any) => {
        // 确定状态文本
        let statusText = '不出席';
        if (!item.has_response) {
          statusText = '未响应';
        } else if (item.will_attend === true) {
          statusText = '出席';
        } else if (item.will_attend === false) {
          statusText = '不出席';
        } else {
          statusText = '已响应';
        }

        // 构建行数据
        const row: string[] = [
          item.name || '未知嘉宾',
          statusText,
          item.has_response ? '是' : '否',
          item.has_response
            ? item.will_attend === true
              ? '是'
              : item.will_attend === false
                ? '否'
                : '未知'
            : '',
          getGuestCountText(item.submission_data || {}, formFields),
          formatDateTime(item.submission_create_time || item.create_time),
        ];

        // 添加表单字段值
        const submissionData = item.submission_data || {};
        formFieldsForExport.forEach(field => {
          const value = getFieldDisplayValue(field, submissionData);
          row.push(value);
        });

        rows.push(row.map(escapeCsvField).join(','));
      });

      // 生成CSV内容
      // APP环境使用\r\n，浏览器环境使用\n并添加BOM
      const isInApp = APPBridge.judgeIsInApp();
      const lineBreak = isInApp ? '\r\n' : '\n';
      const csvContent = isInApp
        ? rows.join(lineBreak)
        : '\uFEFF' + rows.join(lineBreak);

      const filename = `宾客数据_${new Date().toISOString().split('T')[0]}.csv`;

      navigator.share({
        title: '宾客数据',
        text: '宾客数据',
        files: [new File([csvContent], filename, { type: 'text/csv' })],
      });

      return;

      // 以下代码App暂不支持
      // 如果在APP环境中，使用APPBridge下载
      if (isInApp) {
        APPBridge.appCall(
          {
            type: 'MkFileDownload',
            jsCbFnName: 'appBridgeOnMKShare',
            params: {
              fileData: csvContent,
              filename: filename.replace('.csv', ''),
            },
          },
          (data: any) => {
            console.log('文件下载回调', data);
            toast.success(`成功导出 ${filteredResponses.length} 条记录`);
          }
        );
      } else {
        // 浏览器环境：创建Blob并下载
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`成功导出 ${filteredResponses.length} 条记录`);
      }
    } catch (error: any) {
      console.error('导出CSV失败:', error);
      toast.error(error.message || '导出失败');
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-gray-500'>加载中...</div>
      </div>
    );
  }

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
                生成公开链接，任何人可填写回执
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
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
              已邀请嘉宾
            </div>
            <div className='text-sm text-gray-600'>
              共 {totalCount} 人 · {respondedCount} 人已响应
            </div>
          </div>
          {totalCount > 0 && (
            <Button
              size='sm'
              variant='outline'
              className='bg-white border-gray-200 text-gray-700 flex items-center gap-1.5'
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>导出</span>
            </Button>
          )}
        </div>

        {/* 分类标签 */}
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant={responseFilter === 'all' ? 'default' : 'outline'}
            className={
              responseFilter === 'all'
                ? 'bg-[#09090B] text-white'
                : 'bg-gray-100 text-gray-700'
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
                ? 'bg-[#09090B] text-white'
                : 'bg-gray-100 text-gray-700'
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
                ? 'bg-[#09090B] text-white'
                : 'bg-gray-100 text-gray-700'
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
                  className='bg-white border border-[#e4e4e7] rounded-lg p-4 cursor-pointer transition-all'
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
