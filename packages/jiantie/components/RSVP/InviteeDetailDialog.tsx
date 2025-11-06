'use client';
import { createFormSchema } from '@/components/RSVP/comp/index';
import { RSVPFormFields } from '@/components/RSVP/comp/RSVPFormFields';
import { getGuestCountText } from '@/components/RSVP/comp/SubmissionDataView';
import { parseRSVPFormFields, RSVPField } from '@/components/RSVP/type';
import { trpc } from '@/utils/trpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@workspace/ui/components/button';
import { Form } from '@workspace/ui/components/form';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Share,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface InviteeDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invitee: any;
  formConfig?: any;
  onUpdate?: () => void;
  onShare?: () => void;
  showShareButton?: boolean;
}

export function InviteeDetailDialog({
  isOpen,
  onOpenChange,
  invitee,
  formConfig,
  onUpdate,
  onShare,
  showShareButton = false,
}: InviteeDetailDialogProps) {
  const [formFields, setFormFields] = useState<RSVPField[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isContactSectionExpanded, setIsContactSectionExpanded] =
    useState(false);
  const [isUpdatingInvitee, setIsUpdatingInvitee] = useState(false);

  // 创建表单 schema 和 form
  const formSchema = createFormSchema(formFields);
  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  // 加载表单字段配置并初始化表单数据
  useEffect(() => {
    if (invitee && isOpen && formConfig) {
      try {
        // 解析表单字段
        const fields = parseRSVPFormFields(formConfig.form_fields || []);
        setFormFields(fields);

        // 初始化表单值
        const submissionData = invitee.submission_data || {};
        const defaultValues: any = {};

        fields.forEach((field: RSVPField) => {
          if (field.id === 'phone') {
            defaultValues[field.id] = invitee.phone || '';
          } else if (submissionData[field.id] !== undefined) {
            defaultValues[field.id] = submissionData[field.id];
          } else if (field.type === 'checkbox') {
            defaultValues[field.id] = [];
          } else if (field.type === 'guest_count') {
            if (field.splitAdultChild) {
              defaultValues[field.id] = { adult: 0, child: 0 };
            } else {
              defaultValues[field.id] = { total: 0 };
            }
          } else {
            defaultValues[field.id] = '';
          }
        });

        form.reset(defaultValues);
        // 默认展开联系信息区域
        setIsContactSectionExpanded(true);
      } catch (error) {
        console.error('Failed to parse form fields:', error);
        setFormFields([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitee, isOpen, formConfig]);

  // 加载嘉宾操作日志
  useEffect(() => {
    if (invitee && isOpen && formConfig?.id) {
      setLoadingLogs(true);
      (trpc.rsvp.getActionLogs as any)
        .query({
          form_config_id: formConfig.id,
          contact_id: invitee.id,
        })
        .then((logs: any) => {
          setActionLogs(logs || []);
        })
        .catch((error: any) => {
          console.error('Failed to load action logs:', error);
          setActionLogs([]);
        })
        .finally(() => {
          setLoadingLogs(false);
        });
    } else {
      setActionLogs([]);
    }
  }, [invitee, isOpen, formConfig]);

  // 更新嘉宾信息
  const handleUpdateInviteeInfo = async () => {
    if (!invitee || !formConfig) return;

    // 验证表单
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('请检查表单填写是否正确');
      return;
    }

    setIsUpdatingInvitee(true);
    try {
      const formValues = form.getValues();

      // 更新嘉宾基本信息（如果有 phone 字段）
      const phoneField = formFields.find(f => f.id === 'phone');
      if (phoneField) {
        const phoneValue = formValues[phoneField.id] as string;
        await trpc.rsvp.updateInvitee.mutate({
          id: invitee.id,
          phone: phoneValue?.trim() || undefined,
        });
      }

      // 如果有提交记录，需要更新提交数据
      if (invitee.has_response && formConfig.id) {
        const submissions = await trpc.rsvp.getInviteeSubmissions.query({
          contact_id: invitee.id,
          form_config_id: formConfig.id,
        });

        if (submissions && submissions.length > 0) {
          const latestSubmission = submissions[0];
          const submissionData = { ...latestSubmission.submission_data };

          // 更新所有表单字段的值（排除系统字段）
          formFields
            .filter(field => field.enabled !== false)
            .forEach(field => {
              if (formValues[field.id] !== undefined) {
                submissionData[field.id] = formValues[field.id];
              }
            });

          // 保留系统字段（以 _ 开头）
          Object.keys(latestSubmission.submission_data).forEach(key => {
            if (key.startsWith('_')) {
              submissionData[key] = latestSubmission.submission_data[key];
            }
          });

          // 提交新版本
          await trpc.rsvp.updateSubmissionVersion.mutate({
            submission_group_id: latestSubmission.submission_group_id,
            submission_data: submissionData,
            operator_type: 'admin',
            operator_name: '管理员',
          });
        }
      }

      toast.success('更新成功');
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    } finally {
      setIsUpdatingInvitee(false);
    }
  };

  if (!invitee) return null;

  return (
    <ResponsiveDialog
      fullHeight={true}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title='嘉宾详情'
    >
      <div className='p-4 overflow-y-auto bg-gray-50 h-full border-t border-gray-200'>
        {/* 基本信息卡片 */}
        <div className='bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm'>
          <div className='flex items-start justify-between mb-3'>
            <div className='flex-1'>
              <div className='font-semibold text-base text-[#09090B] mb-1'>
                {invitee.name || '未知嘉宾'}
              </div>
              {invitee.has_response && invitee.submission_data ? (
                <div className='text-sm text-gray-600'>
                  {getGuestCountText(invitee.submission_data, formFields) ||
                    '暂无人数信息'}
                </div>
              ) : (
                <div className='text-sm text-gray-400'>未提交</div>
              )}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                invitee.has_response
                  ? invitee.will_attend === true
                    ? 'bg-green-50 text-green-600'
                    : invitee.will_attend === false
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-blue-50 text-blue-600'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {invitee.has_response
                ? invitee.will_attend === true
                  ? '已确认出席'
                  : invitee.will_attend === false
                    ? '已确认不出席'
                    : '已响应'
                : '未响应'}
            </span>
          </div>
        </div>

        {/* 分享专属邀请卡片 */}
        {showShareButton && onShare && (
          <div className='border border-blue-50 rounded-xl p-4 mb-4 shadow-sm bg-blue-50'>
            <div className='flex items-center gap-2 mb-2'>
              <Mail size={16} className='text-gray-600' />
              <div className='font-semibold text-base text-gray-900'>
                分享专属邀请
              </div>
            </div>
            <div className='text-sm text-gray-600 mb-3'>
              通过微信分享活动链接给嘉宾
            </div>
            <Button
              className='w-full bg-[#00BC00] hover:bg-green-600 text-white h-10'
              onClick={onShare}
            >
              <Share size={16} className='mr-2' />
              立即发送
            </Button>
          </div>
        )}

        {/* 联系方式和附加信息卡片 */}
        <div className='bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm'>
          <div
            className={`flex items-center justify-between mb-3 ${
              invitee.has_response ? 'cursor-pointer' : ''
            }`}
            onClick={() => {
              if (invitee.has_response) {
                setIsContactSectionExpanded(!isContactSectionExpanded);
              }
            }}
          >
            <div className='font-semibold text-base text-gray-900'>
              联系方式和附加信息
            </div>
            {invitee.has_response && (
              <>
                {isContactSectionExpanded ? (
                  <ChevronUp size={20} className='text-gray-400' />
                ) : (
                  <ChevronDown size={20} className='text-gray-400' />
                )}
              </>
            )}
          </div>

          {invitee.has_response ? (
            isContactSectionExpanded && (
              <div className='pt-2'>
                {formFields.length > 0 ? (
                  <Form {...form}>
                    <form className='space-y-4'>
                      <RSVPFormFields
                        fields={formFields}
                        control={form.control}
                      />
                      <Button
                        type='button'
                        className='w-full'
                        onClick={handleUpdateInviteeInfo}
                        disabled={isUpdatingInvitee}
                      >
                        {isUpdatingInvitee ? '保存中...' : '保存'}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className='text-sm text-gray-500 text-center py-4'>
                    加载表单配置中...
                  </div>
                )}
              </div>
            )
          ) : (
            <div className='text-sm text-gray-500 text-center py-4'>
              暂无联系方式和附加信息
            </div>
          )}
        </div>

        {/* 交互记录卡片 */}
        <div className='bg-white border border-gray-100 rounded-xl p-4 shadow-sm'>
          <div className='font-semibold text-base text-gray-900 mb-3'>
            交互记录
          </div>
          <div className='flex flex-col gap-3'>
            {loadingLogs ? (
              <div className='text-sm text-gray-500 text-center py-2'>
                加载中...
              </div>
            ) : actionLogs.length > 0 ? (
              <>
                {/* 创建邀请记录 */}
                <div className='flex items-start gap-3 pb-3 border-b border-gray-100'>
                  <UserPlus size={16} className='text-gray-400 mt-0.5' />
                  <div className='flex-1'>
                    <div className='text-sm text-gray-800'>创建邀请</div>
                    <div className='text-xs text-gray-400'>
                      {new Date(invitee.create_time).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* 操作日志列表 */}
                {actionLogs.map((log, index) => {
                  const Icon =
                    log.action_type === 'view_page'
                      ? Eye
                      : log.action_type === 'submit'
                        ? FileText
                        : RefreshCw;
                  const actionText =
                    log.action_type === 'view_page'
                      ? '查看页面'
                      : log.action_type === 'submit'
                        ? '提交表单'
                        : '重新提交';
                  const iconColor =
                    log.action_type === 'view_page'
                      ? 'text-blue-400'
                      : log.action_type === 'submit'
                        ? 'text-green-400'
                        : 'text-orange-400';

                  return (
                    <div
                      key={log.id || index}
                      className='flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0'
                    >
                      <Icon size={16} className={`${iconColor} mt-0.5`} />
                      <div className='flex-1'>
                        <div className='text-sm text-gray-800'>
                          {actionText}
                        </div>
                        <div className='text-xs text-gray-400 flex items-center gap-1 mt-0.5'>
                          <Clock size={12} />
                          {new Date(log.create_time).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {log.device_type && (
                          <div className='text-xs text-gray-400 mt-0.5'>
                            设备：
                            {log.device_type === 'mobile' ? '移动端' : '桌面端'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className='text-sm text-gray-500 text-center py-2'>
                暂无交互记录
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
