'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cdnApi } from '../../services';
import { RSVPProvider, useRSVP } from './RSVPContext';
import { RSVPField } from './type';

interface FormSubmissionsListProps {
  worksId: string;
  pageSize?: number;
}

function FormSubmissionsListInner({
  worksId,
  pageSize = 20,
}: FormSubmissionsListProps) {
  const rsvp = useRSVP();
  const { fields } = rsvp;
  const [currentPage, setCurrentPage] = useState(1);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 获取表单提交数据
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!worksId) {
        setSubmissions([]);
        setTotal(0);
        return;
      }

      setIsLoading(true);
      try {
        const data = await trpc.rsvp.getSubmissionsByWorksId.query({
          works_id: worksId,
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        });
        console.log('data', data);
        setSubmissions(data?.submissions || []);
        setTotal(data?.total || 0);
      } catch (error) {
        console.error('获取表单提交数据失败:', error);
        setSubmissions([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [worksId, currentPage, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  // 格式化日期（用于页面展示）
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  // 格式化日期时间（用于 CSV 导出）
  const formatDateTimeForCsv = (date: Date | string | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // 获取字段显示值（参考 SubmissionDataView 的逻辑）
  const getFieldDisplayValue = (
    field: RSVPField,
    submissionData: any,
    submission: any
  ): string => {
    const value = submissionData[field.id];

    if (field.id === 'name') {
      return value || submission?.invitee_name || '-';
    }

    if (value === undefined || value === null || value === '') {
      return '-';
    }
    if (field.type === 'checkbox') {
      // checkbox 是多选，值是数组
      const selectedValues = Array.isArray(value) ? value : [];
      if (selectedValues.length === 0) return '-';

      return selectedValues
        .map(val => {
          const option = field.options?.find(opt => opt.value === val);
          return option?.label || val;
        })
        .join('、');
    } else if (field.type === 'radio') {
      // radio 是单选，值是字符串
      const option = field.options?.find(opt => opt.value === value);
      return option?.label || String(value);
    } else if (field.type === 'guest_count') {
      // guest_count 类型：如果是对象，显示人数
      if (typeof value === 'object' && value !== null) {
        if (field.splitAdultChild) {
          const adult = (value as any).adult || 0;
          const child = (value as any).child || 0;
          if (adult === 0 && child === 0) return '-';
          if (adult > 0 && child > 0) {
            return `成人 ${adult} · 儿童 ${child}`;
          } else if (adult > 0) {
            return `成人 ${adult} 人`;
          } else {
            return `儿童 ${child} 人`;
          }
        } else {
          const total = (value as any).total || 0;
          return total > 0 ? `${total} 人` : '-';
        }
      }
      return '-';
    } else if (field.type === 'attachment') {
      // 附件类型：显示所有附件名称，使用顿号分隔
      const attachments = Array.isArray(value) ? value : [];
      if (!attachments.length) return '-';
      const names = attachments
        .map((item: any) => item?.name || item?.url)
        .filter(Boolean);
      return names.length ? names.join('、') : '-';
    } else {
      // 其它类型直接显示字符串
      return String(value);
    }
  };

  // CSV 转义
  const escapeCsvField = (field: string) => {
    if (!field) return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // 判断附件是否为图片
  const isImageAttachment = (item: any): boolean => {
    if (!item) return false;
    const mimeType = (item.mimeType as string | undefined) || '';
    if (mimeType.startsWith('image/')) return true;
    const url: string = item.url || '';
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
  };

  // 数据看板中渲染附件缩略图（只展示图片）
  const renderAttachmentThumbs = (submissionData: any, fieldId: string) => {
    if (!submissionData || typeof submissionData !== 'object') {
      return '-';
    }
    const raw = (submissionData as any)[fieldId];
    if (!raw) return '-';
    const list = (Array.isArray(raw) ? raw : []).filter(isImageAttachment);
    if (!list.length) return '-';

    const visible = list.slice(0, 3);
    const extra = list.length - visible.length;

    return (
      <div className='flex items-center gap-1'>
        {visible.map((item: any, index: number) => (
          <div
            key={`${item.url || index}`}
            className='w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer'
            onClick={() => {
              if (!item?.url) return;
              setPreviewImage(cdnApi(item.url));
              setPreviewOpen(true);
            }}
          >
            <img
              src={cdnApi(item.url)}
              alt={item.name || '附件图片'}
              className='w-full h-full object-cover'
            />
          </div>
        ))}
        {extra > 0 && (
          <span className='text-xs text-gray-500 ml-1'>+{extra}</span>
        )}
      </div>
    );
  };

  // 导出当前页 CSV
  const handleExportCsv = () => {
    try {
      if (!submissions || submissions.length === 0) {
        window.alert('当前页没有可导出的数据');
        return;
      }

      // 构建表头：所有启用的表单字段 + 提交时间
      const enabledFields = fields.filter(field => field.enabled !== false);
      const headers = enabledFields.map(field => field.label);
      headers.push('提交时间');

      const rows: string[] = [];
      rows.push(headers.map(escapeCsvField).join(','));

      submissions.forEach((submission: any) => {
        const submissionData = submission.submission_data || {};
        const row: string[] = [];

        // 添加所有启用的表单字段值
        enabledFields.forEach(field => {
          // 特殊处理 ask_will_attend 字段
          if (field.id === 'ask_will_attend') {
            const attendText =
              submission.will_attend === true
                ? '是'
                : submission.will_attend === false
                  ? '否'
                  : '-';
            row.push(attendText);
          } else {
            // 其他字段使用通用格式化函数
            const value = getFieldDisplayValue(
              field,
              submissionData,
              submission
            );
            row.push(value);
          }
        });

        // 添加提交时间
        const createTimeText = formatDateTimeForCsv(submission.create_time);
        row.push(createTimeText);

        rows.push(row.map(v => escapeCsvField(String(v ?? ''))).join(','));
      });

      const csvContent = '\uFEFF' + rows.join('\n');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `表单收集数据_${dateStr}_第${currentPage}页.csv`;

      // 优先使用 Web Share API（参考邀请嘉宾页面的导出写法）
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        const file = new File([csvContent], filename, {
          type: 'text/csv',
        });

        (navigator as any)
          .share({
            title: '表单收集数据',
            text: '表单收集数据',
            files: [file],
          })
          .catch((error: any) => {
            console.error('分享 CSV 失败，降级为本地下载:', error);

            const blob = new Blob([csvContent], {
              type: 'text/csv;charset=utf-8;',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          });

        return;
      }

      // 不支持 Web Share 时，回退到浏览器下载
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 CSV 失败:', error);
      window.alert('导出失败，请稍后重试');
    }
  };

  return (
    <div className='flex flex-col h-full bg-slate-50'>
      {/* Content */}
      <div className='flex-1 overflow-y-auto p-4'>
        {/* 顶部操作栏 */}
        <div className='flex items-center justify-between mb-3'>
          <div className='text-sm text-gray-600'>共 {total} 条记录</div>
          <Button
            size='sm'
            variant='outline'
            className='h-8 px-3 rounded-full text-xs'
            disabled={isLoading || submissions.length === 0}
            onClick={handleExportCsv}
          >
            <Download className='w-3 h-3 mr-1' />
            导出数据
          </Button>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-20'>
            <div className='text-gray-500'>加载中...</div>
          </div>
        ) : submissions.length === 0 ? (
          <div className='flex items-center justify-center py-20'>
            <div className='text-gray-500'>暂无表单收集数据</div>
          </div>
        ) : (
          <>
            <div className='bg-white rounded-sm overflow-hidden shadow-sm border border-[#e2e8f0]'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* 动态生成所有启用的表单字段列 */}
                      {fields
                        .filter(field => field.enabled !== false)
                        .map(field => (
                          <TableHead key={field.id} className='min-w-[120px]'>
                            {field.label === '访客' ? '出席人数' : field.label}
                          </TableHead>
                        ))}
                      {/* 固定列：提交时间 */}
                      <TableHead className='min-w-[150px]'>提交时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission: any) => {
                      const submissionData = submission.submission_data || {};

                      return (
                        <TableRow key={submission.id}>
                          {/* 动态渲染所有启用的表单字段值 */}
                          {fields
                            .filter(field => field.enabled !== false)
                            .map(field => {
                              // 特殊处理附件字段，显示缩略图
                              if (field.type === 'attachment') {
                                return (
                                  <TableCell key={field.id}>
                                    {renderAttachmentThumbs(
                                      submissionData,
                                      field.id
                                    )}
                                  </TableCell>
                                );
                              }
                              // 特殊处理 ask_will_attend 字段，使用 submission.will_attend
                              if (field.id === 'ask_will_attend') {
                                return (
                                  <TableCell key={field.id}>
                                    {submission.will_attend === true
                                      ? '是'
                                      : submission.will_attend === false
                                        ? '否'
                                        : '-'}
                                  </TableCell>
                                );
                              }
                              // 其他字段使用通用格式化函数
                              return (
                                <TableCell key={field.id}>
                                  {getFieldDisplayValue(
                                    field,
                                    submissionData,
                                    submission
                                  )}
                                </TableCell>
                              );
                            })}
                          {/* 固定列：提交时间 */}
                          <TableCell>
                            {formatDate(submission.create_time)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-2 mt-4'>
                <button
                  className='px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </button>
                <span className='text-sm text-gray-600'>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className='px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
                  onClick={() =>
                    setCurrentPage(p => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ResponsiveDialog
        isOpen={previewOpen}
        isDialog
        title='附件图片预览'
        onOpenChange={open => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewImage(null);
          }
        }}
      >
        {previewImage && (
          <div className='w-full flex justify-center p-2'>
            <img
              src={previewImage}
              alt='附件图片预览'
              className='max-h-[70vh] w-auto object-contain'
            />
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

// 导出组件：使用 Provider 包裹
export function FormSubmissionsList({ worksId }: FormSubmissionsListProps) {
  return (
    <RSVPProvider worksId={worksId} canCreate={false}>
      <FormSubmissionsListInner worksId={worksId} />
    </RSVPProvider>
  );
}
