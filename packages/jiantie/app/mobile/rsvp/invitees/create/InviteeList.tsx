'use client';
import { getGuestCountText } from '@/components/RSVP/comp/SubmissionDataView';
import { parseRSVPFormFields, RSVPField } from '@/components/RSVP/type';
import { getShareUrl, useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Copy, Download, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface InviteeListProps {
  worksId: string;
  onLoad?: (hasData: boolean) => void;
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
}

export function InviteeList({
  worksId,
  onLoad,
  showCreateDialog,
  setShowCreateDialog,
}: InviteeListProps) {
  const store = useStore();
  const [inviteeResponses, setInviteeResponses] = useState<any[]>([]);
  const [responseFilter, setResponseFilter] = useState<
    'all' | 'responded' | 'not_responded'
  >('all');
  const [formFields, setFormFields] = useState<RSVPField[]>([]);
  const [worksTitle, setWorksTitle] = useState<string>('');

  // 通过 works_id 获取表单字段和作品信息（可选）
  useEffect(() => {
    if (!worksId) return;
    const loadFormFields = async () => {
      try {
        const config = (await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: worksId,
        })) as any;

        if (config) {
          if (config.form_fields) {
            const fields = parseRSVPFormFields(
              config.form_fields
            ) as RSVPField[];
            setFormFields(fields);
          }
          // 获取作品标题
          if (config.works_title) {
            setWorksTitle(config.works_title);
          }
        }
      } catch (error) {
        // 如果没有表单配置，不影响嘉宾管理功能
        console.warn('Failed to load form fields:', error);
      }
    };
    loadFormFields();
    const fetchInviteeResponses = async () => {
      if (!worksId) return;
      try {
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          works_id: worksId,
        });
        const responses = data || [];
        setInviteeResponses(responses);
        // 通知父组件是否有数据
        onLoad?.(responses.length > 0);
      } catch (error: any) {
        console.error('Failed to fetch invitee responses:', error);
        toast.error(error.message || '加载失败');
        // 出错时也通知父组件
        onLoad?.(false);
      }
    };
    fetchInviteeResponses();
  }, [worksId]);

  // 跳转到嘉宾详情页面
  const handleOpenInviteeDetail = (invitee: any) => {
    const detailUrl = `/mobile/rsvp/invitees/${invitee.id}?works_id=${worksId}`;
    store.push(detailUrl);
  };

  // 删除嘉宾
  const handleDeleteInvitee = async (invitee: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除该嘉宾吗？已发送的链接仍然有效。')) {
      return;
    }
    try {
      await trpc.rsvp.deleteInvitee.mutate({ id: invitee.id });
      toast.success('删除成功');
      // 刷新列表
      const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
        works_id: worksId,
      });
      setInviteeResponses(data || []);
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // 获取姓名首字符用于头像
  const getInitial = (name: string): string => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // 获取邀请标题预览
  const getInviteTitlePreview = (invitee: any): string => {
    if (invitee.invite_title) {
      return invitee.invite_title;
    }
    const title = worksTitle || '邀请函';
    return `诚邀 ${invitee.name || ''} - ${title}`;
  };

  // 生成嘉宾分享链接
  const getInviteeShareLink = (invitee: any): string => {
    if (typeof window === 'undefined' || !worksId || !invitee) return '';
    return getShareUrl(worksId, {
      rsvp_invitee: invitee.name || '',
      rsvp_invitee_id: invitee.id || '',
    });
  };

  // 复制链接
  const handleCopyLink = async (invitee: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡

    const hasPermission = await store.checkSharePermission(worksId, {
      trackData: {
        works_id: worksId,
        ref_object_id: worksId || '',
        works_type: 'h5',
        tab: 'personal',
        vipType: 'rsvp',
      },
    });

    if (!hasPermission) return;

    const shareLink = getInviteeShareLink(invitee);
    if (!shareLink) {
      toast.error('无法生成分享链接');
      return;
    }

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(shareLink);
        toast.success('链接已复制');
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('链接已复制');
      }
    } catch (error: any) {
      toast.error('复制失败，请重试');
    }
  };

  // 微信分享
  const handleShareToWechat = async (invitee: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    // const hasPermission = await share.checkSharePermission(worksId, {
    //   trackData: {
    //     works_id: worksId,
    //     ref_object_id: worksId || '',
    //     tab: 'personal',
    //     vipType: 'rsvp',
    //   },
    // });
    // if (!hasPermission) return;
    const shareLink = getInviteeShareLink(invitee);
    if (!shareLink) {
      toast.error('无法生成分享链接');
      return;
    }

    try {
      // 获取作品信息用于分享
      const worksInfo = await trpc.works.findById.query({
        id: worksId,
      });
      await store.shareWork({
        worksDetail: worksInfo,
        url: shareLink,
        title: `诚邀 ${invitee.name || ''} - ${worksInfo?.title || '邀请函'}`, // 自定义标题覆盖
        shareType: 'wechat',
        checkPermission: true, // 自动权限检查和 VIP 拦截
      });
    } catch (error: any) {
      toast.error(error.message || '分享失败');
    }
  };

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

      const headers = [
        '姓名',
        '状态',
        '响应状态',
        '是否出席',
        '人数',
        '最近活动时间',
      ];

      const formFieldsForExport = formFields.filter(
        f => f.enabled !== false && f.type !== 'guest_count'
      );
      formFieldsForExport.forEach(field => {
        headers.push(field.label);
      });

      const rows: string[] = [];
      rows.push(headers.map(escapeCsvField).join(','));

      filteredResponses.forEach((item: any) => {
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

        const submissionData = item.submission_data || {};
        formFieldsForExport.forEach(field => {
          const value = getFieldDisplayValue(field, submissionData);
          row.push(value);
        });

        rows.push(row.map(escapeCsvField).join(','));
      });

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
    } catch (error: any) {
      console.error('导出CSV失败:', error);
      toast.error(error.message || '导出失败');
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
            已邀请嘉宾
          </div>
          <div className='text-sm text-gray-600'>
            共 {totalCount} 人 · {respondedCount} 人已响应
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {totalCount > 0 && (
            <Button size='sm' variant='outline' onClick={handleExportCSV}>
              <Download size={16} />
              <span>导出数据</span>
            </Button>
          )}
          {/* 创建按钮 */}
          <Button size='sm' onClick={() => setShowCreateDialog(true)}>
            <Plus size={18} />
            <span>邀请嘉宾</span>
          </Button>
        </div>
      </div>

      {/* 分类标签 */}
      <div className='flex items-center gap-2'>
        <Button
          size='sm'
          variant={responseFilter === 'all' ? 'default' : 'outline'}
          className={responseFilter === 'all' ? 'bg-[#09090B] text-white' : ''}
          onClick={() => setResponseFilter('all')}
        >
          全部
        </Button>
        <Button
          size='sm'
          variant={responseFilter === 'not_responded' ? 'default' : 'outline'}
          className={
            responseFilter === 'not_responded' ? 'bg-[#09090B] text-white' : ''
          }
          onClick={() => setResponseFilter('not_responded')}
        >
          未响应
        </Button>
        <Button
          size='sm'
          variant={responseFilter === 'responded' ? 'default' : 'outline'}
          className={
            responseFilter === 'responded' ? 'bg-[#09090B] text-white' : ''
          }
          onClick={() => setResponseFilter('responded')}
        >
          已响应
        </Button>
      </div>

      {/* 筛选后的记录列表 */}
      <div className='space-y-3'>
        {(() => {
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
            const inviteeName = item.name || '未知嘉宾';
            const titlePreview = getInviteTitlePreview(item);

            // 获取状态信息
            let statusText = '未查看';
            let statusColor = 'text-gray-500';
            let statusBgColor = 'bg-gray-50';

            if (item.has_response) {
              if (item.will_attend === true) {
                statusText = '已确认出席';
                statusColor = 'text-green-600';
                statusBgColor = 'bg-green-50';
              } else if (item.will_attend === false) {
                statusText = '已确认不出席';
                statusColor = 'text-orange-600';
                statusBgColor = 'bg-orange-50';
              } else {
                statusText = '已查看';
                statusColor = 'text-blue-600';
                statusBgColor = 'bg-blue-50';
              }
            }

            return (
              <div
                key={item.id}
                className='bg-white border border-gray-100 rounded-lg p-4'
              >
                {/* 头部：头像、姓名、标题预览、删除按钮 */}
                <div
                  className='flex items-start gap-3 mb-3 cursor-pointer'
                  onClick={() => handleOpenInviteeDetail(item)}
                >
                  {/* 头像 */}
                  <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0'>
                    <span className='text-base font-medium text-blue-600'>
                      {getInitial(inviteeName)}
                    </span>
                  </div>
                  {/* 姓名和标题预览 */}
                  <div className='flex-1 min-w-0'>
                    <div className='font-semibold text-base text-[#09090B] mb-1 flex items-center gap-2 flex-wrap'>
                      <span className='max-w-[50%] truncate'>
                        {inviteeName}
                      </span>
                      {/* 来源标签 */}
                      {item.source_type && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            item.source_type === 'auto'
                              ? 'text-purple-600 bg-purple-50'
                              : 'text-blue-600 bg-blue-50'
                          }`}
                        >
                          {item.source_type === 'auto'
                            ? '公开链接'
                            : '主动邀请'}
                        </span>
                      )}
                      {/* 状态标签 */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${statusColor} ${statusBgColor}`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className='text-sm text-gray-500 truncate mb-1'>
                      标题预览: {titlePreview}
                    </div>
                  </div>
                  {/* 删除按钮 */}
                  <button
                    title='删除嘉宾'
                    onClick={e => handleDeleteInvitee(item, e)}
                    className='w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors'
                  >
                    <Trash2 size={16} className='text-gray-500' />
                  </button>
                </div>
                {/* 操作按钮 */}
                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    // className='flex-1'
                    onClick={e => handleCopyLink(item, e)}
                  >
                    <Copy size={14} />
                    <span>复制链接</span>
                  </Button>
                  <Button
                    size='sm'
                    className='bg-green-50 text-green-700 border-green-500 border flex items-center justify-center gap-1.5'
                    onClick={e => handleShareToWechat(item, e)}
                  >
                    <MessageCircle size={14} />
                    <span>微信邀请</span>
                  </Button>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
