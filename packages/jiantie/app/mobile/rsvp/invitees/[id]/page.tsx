'use client';
import { createFormSchema } from '@/components/RSVP/comp/index';
import {
  ButtonWithTheme,
  RSVPFormFields,
} from '@/components/RSVP/comp/RSVPFormFields';
import {
  getGuestCountText,
  SubmissionDataView,
} from '@/components/RSVP/comp/SubmissionDataView';
import {
  DEFAULT_RSVP_THEME,
  parseRSVPFormFields,
  RSVPField,
  RSVPSubmission,
  RSVPTheme,
} from '@/components/RSVP/type';
import APPBridge from '@/store/app-bridge';
import { trpc } from '@/utils/trpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@workspace/ui/components/form';
import { Clock, Eye, FileText, Pencil, RefreshCw, X } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../../RSVPLayoutContext';

/**
 * 将主题配置转换为 CSS 变量
 */
function themeToCSSVariables(theme?: RSVPTheme): React.CSSProperties {
  const mergedTheme = {
    ...DEFAULT_RSVP_THEME,
    ...(theme || {}),
  };

  return {
    '--rsvp-bg-color': mergedTheme.backgroundColor,
    '--rsvp-border-radius': `${mergedTheme.borderRadius}px`,
    '--rsvp-border-color': mergedTheme.borderColor,
    '--rsvp-border-width': `${mergedTheme.borderWidth}px`,
    '--rsvp-box-shadow': mergedTheme.boxShadow,
    '--rsvp-backdrop-filter': mergedTheme.backdropFilter || 'none',
    '--rsvp-control-font-size': `${
      mergedTheme.controlFontSize ?? DEFAULT_RSVP_THEME.controlFontSize
    }px`,
    '--rsvp-control-padding': `${
      mergedTheme.controlPadding ?? DEFAULT_RSVP_THEME.controlPadding
    }px`,
    '--rsvp-primary-btn-color': mergedTheme.primaryButtonColor,
    '--rsvp-primary-btn-text-color': mergedTheme.primaryButtonTextColor,
    '--rsvp-secondary-btn-color': mergedTheme.secondaryButtonColor,
    '--rsvp-secondary-btn-text-color': mergedTheme.secondaryButtonTextColor,
    '--rsvp-secondary-btn-border-color': mergedTheme.secondaryButtonBorderColor,
    '--rsvp-input-bg-color': mergedTheme.inputBackgroundColor,
    '--rsvp-input-border-color': mergedTheme.inputBorderColor,
    '--rsvp-input-text-color': mergedTheme.inputTextColor,
    '--rsvp-input-placeholder-color':
      mergedTheme.inputPlaceholderColor || mergedTheme.secondaryButtonTextColor,
    '--rsvp-text-color': mergedTheme.textColor,
    '--rsvp-label-color': mergedTheme.labelColor,
  } as React.CSSProperties;
}

export default function InviteeDetailPage() {
  const { setTitle } = useRSVPLayout();

  // 设置页面标题
  useEffect(() => {
    setTitle('嘉宾详情');
  }, [setTitle]);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteeId = params.id as string;
  const worksId = searchParams.get('works_id') || '';

  const [invitee, setInvitee] = useState<any>(null);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState<RSVPField[]>([]);
  const [latestSubmission, setLatestSubmission] =
    useState<RSVPSubmission | null>(null);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isUpdatingInvitee, setIsUpdatingInvitee] = useState(false);

  // 创建表单 schema 和 form
  const formSchema = createFormSchema(formFields);
  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  // 计算主题 CSS 变量
  const themeCSSVariables = useMemo(
    () => themeToCSSVariables(formConfig?.theme),
    [formConfig?.theme]
  );

  // 加载表单配置（可选，用于获取表单字段）
  useEffect(() => {
    if (!worksId) return;
    const loadFormConfig = async () => {
      try {
        const config = (await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: worksId,
        })) as any;
        setFormConfig(config);
      } catch (error) {
        // 如果没有表单配置，不影响嘉宾详情功能
        console.warn('Failed to load form config:', error);
      }
    };
    loadFormConfig();
  }, [worksId]);

  // 加载嘉宾详情和最新提交记录
  useEffect(() => {
    const loadInvitee = async () => {
      if (!inviteeId || !worksId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          works_id: worksId,
        });
        const found = data.find((item: any) => item.id === inviteeId);
        setInvitee(found || null);

        // 如果有提交记录，获取最新的提交数据
        if (found?.has_response && found?.id && formConfig?.id) {
          try {
            const submissions = await trpc.rsvp.getInviteeSubmissions.query({
              contact_id: found.id,
              form_config_id: formConfig.id,
            });
            if (submissions.length > 0) {
              setLatestSubmission(submissions[0]);
            } else {
              setLatestSubmission(null);
            }
          } catch (error) {
            console.error('Failed to load submissions:', error);
            setLatestSubmission(null);
          }
        } else {
          setLatestSubmission(null);
        }
      } catch (error) {
        console.error('Failed to load invitee:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInvitee();
  }, [inviteeId, worksId, formConfig]);

  // 加载表单字段配置并初始化表单数据
  useEffect(() => {
    if (invitee && formConfig) {
      try {
        // 解析表单字段
        const fields = parseRSVPFormFields(formConfig.form_fields || []);
        setFormFields(fields);

        // 使用最新的提交记录来初始化表单值
        const submissionData = latestSubmission?.submission_data || {};
        const defaultValues: any = {};

        fields.forEach((field: RSVPField) => {
          if (field.id === 'phone') {
          } else if (submissionData[field.id] !== undefined) {
            // 对于 guest_count 类型，确保成人人数至少为1
            if (field.type === 'guest_count') {
              const value = submissionData[field.id];
              if (field.splitAdultChild && typeof value === 'object') {
                defaultValues[field.id] = {
                  adult: Math.max(1, value.adult || 1),
                  child: value.child || 0,
                };
              } else if (typeof value === 'object') {
                defaultValues[field.id] = {
                  total: Math.max(1, value.total || 1),
                };
              } else {
                // 兼容旧数据格式
                defaultValues[field.id] = field.splitAdultChild
                  ? { adult: 1, child: 0 }
                  : { total: 1 };
              }
            } else {
              defaultValues[field.id] = submissionData[field.id];
            }
          } else if (field.type === 'checkbox') {
            defaultValues[field.id] = [];
          } else if (field.type === 'guest_count') {
            if (field.splitAdultChild) {
              defaultValues[field.id] = { adult: 1, child: 0 };
            } else {
              defaultValues[field.id] = { total: 1 };
            }
          } else {
            defaultValues[field.id] = '';
          }
        });

        form.reset(defaultValues);
      } catch (error) {
        console.error('Failed to parse form fields:', error);
        setFormFields([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitee, formConfig, latestSubmission]);

  // 加载嘉宾操作日志
  useEffect(() => {
    if (invitee && formConfig?.id) {
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
  }, [invitee, formConfig]);

  // 分享嘉宾邀请
  const handleShareInvitee = async () => {
    if (!invitee) return;

    // 跳转到分享页面
    const shareUrl = `/mobile/rsvp/share?works_id=${worksId}&mode=invitee&contact_id=${invitee.id}&contact_name=${encodeURIComponent(invitee.name)}&from=detail`;

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${shareUrl}`,
        type: 'URL',
      });
    } else {
      router.push(shareUrl);
    }
  };

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

        if (submissions.length > 0) {
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
      // 刷新数据
      const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
        works_id: worksId,
      });
      const updated = data.find((item: any) => item.id === inviteeId);
      if (updated) {
        setInvitee(updated);
        // 重新获取最新的提交记录
        if (updated.has_response && updated.id) {
          try {
            const submissions = await trpc.rsvp.getInviteeSubmissions.query({
              contact_id: updated.id,
              form_config_id: formConfig?.id || '',
            });
            if (submissions.length > 0) {
              setLatestSubmission(submissions[0]);
            }
          } catch (error) {
            console.error('Failed to reload submissions:', error);
          }
        }
      }
      // 退出编辑模式
      setIsEditingContact(false);
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    } finally {
      setIsUpdatingInvitee(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-500'>加载中...</div>
      </div>
    );
  }

  if (!invitee) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-500'>未找到嘉宾信息</div>
      </div>
    );
  }

  return (
    <div className='p-4'>
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
      {/* <div className='border border-blue-50 rounded-xl p-4 mb-4 shadow-sm bg-blue-50'>
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
          onClick={handleShareInvitee}
        >
          <Share size={16} className='mr-2' />
          立即发送
        </Button>
      </div> */}

      {/* 联系方式和附加信息卡片 */}
      <div className='bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm'>
        <div className='flex items-center justify-between mb-3'>
          <div className='font-semibold text-base text-gray-900'>
            联系方式和附加信息
          </div>
          {invitee.has_response && !isEditingContact && (
            <button
              onClick={() => setIsEditingContact(true)}
              className='flex items-center gap-1 text-sm text-blue-600'
            >
              <Pencil size={16} />
              <span>编辑</span>
            </button>
          )}
        </div>

        {invitee.has_response ? (
          isEditingContact ? (
            <div className='pt-2' style={themeCSSVariables}>
              {formFields.length > 0 ? (
                <Form {...form}>
                  <form className='space-y-4'>
                    <RSVPFormFields
                      fields={formFields}
                      control={form.control}
                    />
                    <div className='flex gap-2'>
                      <ButtonWithTheme
                        type='button'
                        className='flex-1'
                        onClick={handleUpdateInviteeInfo}
                        disabled={isUpdatingInvitee}
                        style={{
                          backgroundColor: 'var(--rsvp-primary-btn-color)',
                          color: 'var(--rsvp-primary-btn-text-color)',
                          borderColor: 'var(--rsvp-primary-btn-color)',
                        }}
                      >
                        {isUpdatingInvitee ? '保存中...' : '保存'}
                      </ButtonWithTheme>
                      <ButtonWithTheme
                        type='button'
                        variant='outline'
                        onClick={() => {
                          // 重置表单到原始值（使用最新的提交记录）
                          const submissionData =
                            latestSubmission?.submission_data || {};
                          const defaultValues: any = {};
                          formFields.forEach((field: RSVPField) => {
                            if (submissionData[field.id] !== undefined) {
                              // 对于 guest_count 类型，确保成人人数至少为1
                              if (field.type === 'guest_count') {
                                const value = submissionData[field.id];
                                if (
                                  field.splitAdultChild &&
                                  typeof value === 'object'
                                ) {
                                  defaultValues[field.id] = {
                                    adult: Math.max(1, value.adult || 1),
                                    child: value.child || 0,
                                  };
                                } else if (typeof value === 'object') {
                                  defaultValues[field.id] = {
                                    total: Math.max(1, value.total || 1),
                                  };
                                } else {
                                  // 兼容旧数据格式
                                  defaultValues[field.id] =
                                    field.splitAdultChild
                                      ? { adult: 1, child: 0 }
                                      : { total: 1 };
                                }
                              } else {
                                defaultValues[field.id] =
                                  submissionData[field.id];
                              }
                            } else if (field.type === 'checkbox') {
                              defaultValues[field.id] = [];
                            } else if (field.type === 'guest_count') {
                              if (field.splitAdultChild) {
                                defaultValues[field.id] = {
                                  adult: 1,
                                  child: 0,
                                };
                              } else {
                                defaultValues[field.id] = { total: 1 };
                              }
                            } else {
                              defaultValues[field.id] = '';
                            }
                          });
                          form.reset(defaultValues);
                          setIsEditingContact(false);
                        }}
                        disabled={isUpdatingInvitee}
                        style={{
                          backgroundColor: 'var(--rsvp-secondary-btn-color)',
                          color: 'var(--rsvp-secondary-btn-text-color)',
                          borderColor: 'var(--rsvp-secondary-btn-border-color)',
                        }}
                      >
                        <X size={16} className='mr-1' />
                        取消
                      </ButtonWithTheme>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className='text-sm text-gray-500 text-center py-4'>
                  加载表单配置中...
                </div>
              )}
            </div>
          ) : (
            <div className='pt-2' style={themeCSSVariables}>
              {formFields.length > 0 ? (
                <SubmissionDataView
                  submissionData={{
                    ...(latestSubmission?.submission_data || {}),
                  }}
                  fields={formFields}
                  showOnlyWithValues={false}
                />
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

                const isSubmitAction =
                  log.action_type === 'submit' ||
                  log.action_type === 'resubmit';
                const willAttend = log.submission?.will_attend;

                return (
                  <div
                    key={log.id || index}
                    className='flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0'
                  >
                    <Icon size={16} className={`${iconColor} mt-0.5`} />
                    <div className='flex-1'>
                      <div className='text-sm text-gray-800'>{actionText}</div>
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
                      {isSubmitAction && willAttend !== undefined && (
                        <div className='text-xs text-gray-400 mt-0.5'>
                          是否出席：
                          <span
                            className={
                              willAttend === true
                                ? 'text-green-500 ml-1'
                                : willAttend === false
                                  ? 'text-orange-500 ml-1'
                                  : 'text-gray-500 ml-1'
                            }
                          >
                            {willAttend === true
                              ? '是'
                              : willAttend === false
                                ? '否'
                                : '未确定'}
                          </span>
                        </div>
                      )}
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
  );
}
