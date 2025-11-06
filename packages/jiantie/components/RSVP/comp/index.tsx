'use client';
import { getCookie, setCookie } from '@/components/viewer/utils/helper';
import { trpc } from '@/utils/trpc';
import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Form } from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ResponsiveDialog } from '../../Drawer';
import { RSVPConfigPanel } from '../configPanel';
import { RSVPProvider, useRSVP } from '../RSVPContext';
import { RSVPAttrs, RSVPField } from '../type';
import { RSVPFormFields } from './RSVPFormFields';
import { SubmissionView } from './SubmissionView';

// Cookie 键名
const COOKIE_CONTACT_ID = 'rsvp_contact_id';
const COOKIE_EXPIRE_DAYS = 365; // Cookie 有效期1年

// 根据字段配置动态生成 zod schema
export function createFormSchema(fields: RSVPField[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  // 只处理启用的字段
  fields
    .filter(field => field.enabled !== false)
    .forEach(field => {
      let fieldSchema: z.ZodTypeAny;

      if (field.type === 'text') {
        fieldSchema = z.string();
      } else if (field.type === 'radio') {
        fieldSchema = z.string();
      } else if (field.type === 'checkbox') {
        fieldSchema = z.array(z.string());
      } else if (field.type === 'guest_count') {
        // 访客人数类型：如果支持大人小孩划分，则存储 { adult: number, child: number }，否则存储 { total: number }
        if (field.splitAdultChild) {
          fieldSchema = z.object({
            adult: z.number().int().min(0, '大人人数不能小于0'),
            child: z.number().int().min(0, '小孩人数不能小于0'),
          });
        } else {
          fieldSchema = z.object({
            total: z.number().int().min(0, '人数不能小于0'),
          });
        }
      } else {
        fieldSchema = z.string();
      }

      // 如果字段是必填的，添加 required 验证
      if (field.required) {
        if (field.type === 'checkbox') {
          fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>).min(
            1,
            `${field.label} 为必选`
          );
        } else if (field.type === 'guest_count') {
          // guest_count 类型的必填验证已经在对象内部处理
          // 只需要确保至少有一个值大于0
          if (field.splitAdultChild) {
            fieldSchema = (fieldSchema as z.ZodObject<any>).refine(
              (val: any) => val.adult > 0 || val.child > 0,
              {
                message: `${field.label} 至少需要填写一人`,
              }
            );
          } else {
            fieldSchema = (fieldSchema as z.ZodObject<any>).refine(
              (val: any) => val.total > 0,
              {
                message: `${field.label} 至少需要填写一人`,
              }
            );
          }
        } else {
          fieldSchema = (fieldSchema as z.ZodString).min(
            1,
            `${field.label} 为必填`
          );
        }
      } else {
        // 可选字段，允许空值
        if (field.type === 'checkbox') {
          fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>)
            .optional()
            .default([]);
        } else if (field.type === 'guest_count') {
          // guest_count 可选时，默认值为空对象
          if (field.splitAdultChild) {
            fieldSchema = (fieldSchema as z.ZodObject<any>)
              .optional()
              .default({ adult: 0, child: 0 });
          } else {
            fieldSchema = (fieldSchema as z.ZodObject<any>)
              .optional()
              .default({ total: 0 });
          }
        } else {
          fieldSchema = (fieldSchema as z.ZodString).optional().default('');
        }
      }

      schemaShape[field.id] = fieldSchema;
    });

  return z.object(schemaShape);
}

interface RSVPCompProps {
  attrs: RSVPAttrs;
  editorSDK: EditorSDK;
  layer: LayerElemItem;
}

const FormCompWrapper = styled.div`
  background-color: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  overflow: hidden;
  border: 1px solid #e5e7ec;
  .header {
    padding: 8px 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  .content {
    padding: 16px;
  }
`;

// 内部组件：负责纯粹的渲染
function RSVPCompInner({ attrs, editorSDK }: RSVPCompProps) {
  const { formConfigId } = attrs;
  const searchParams = useSearchParams();
  const router = useRouter();
  const rsvp = useRSVP();
  const { config, loading, error, fields } = rsvp;

  // 从 URL 参数获取被邀请人信息（支持新的专属链接参数）
  // 解码 URL 参数，处理可能的双重编码情况
  const decodeParam = (value: string | null): string => {
    if (!value) return '';
    try {
      // searchParams.get() 已经自动解码一次，但如果遇到双重编码，需要再次解码
      // 检查是否还包含编码字符（%）
      if (value.includes('%')) {
        return decodeURIComponent(value);
      }
      return value;
    } catch {
      return value;
    }
  };

  const inviteeName =
    decodeParam(searchParams.get('rsvp_invitee')) ||
    decodeParam(searchParams.get('invitee')) ||
    decodeParam(searchParams.get('name')) ||
    '';
  const inviteePhone = decodeParam(searchParams.get('rsvp_phone'));
  const inviteeEmail = decodeParam(searchParams.get('rsvp_email'));

  // 没有在编辑器时，就是访客模式，需要根据访客的设备生成访客的ID
  const isViewerMode = !editorSDK;

  // 判断链接类型：如果有邀请人姓名，且没有 viewed 标记，则是专属邀请链接；否则是公开链接
  const isInviteeLink = !!inviteeName && !searchParams.get('rsvp_viewed');

  // 公开链接模式下的访客姓名（专属链接不需要）
  const [guestName, setGuestName] = useState<string>('');

  const [willAttend, setWillAttend] = useState<boolean | null>(null); // null=未选择, true=出席, false=不出席
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmissionGroupId, setLastSubmissionGroupId] = useState<
    string | null
  >(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false); // 是否已提交成功
  const [latestSubmission, setLatestSubmission] = useState<any | null>(null); // 最新提交记录

  // 联系人ID（由后端生成，前端只负责保存）
  const [contactId, setContactId] = useState<string | null>(null);

  // 是否首次访问（用于判断是否需要记录访问日志）
  const [hasCheckedFirstVisit, setHasCheckedFirstVisit] =
    useState<boolean>(false);

  // 动态生成表单 schema
  const formSchema = useMemo(() => {
    if (fields.length === 0) {
      return z.record(z.string(), z.union([z.string(), z.array(z.string())]));
    }
    return createFormSchema(fields);
  }, [fields]);

  // 初始化表单默认值（只处理启用的字段）
  const getDefaultValues = useMemo(() => {
    const defaults: Record<string, string | string[] | Record<string, number>> =
      {};
    fields
      .filter(f => f.enabled !== false)
      .forEach(f => {
        if (typeof f.defaultValue !== 'undefined') {
          defaults[f.id] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          defaults[f.id] = [];
        } else if (f.type === 'guest_count') {
          if (f.splitAdultChild) {
            defaults[f.id] = { adult: 1, child: 0 };
          } else {
            defaults[f.id] = { total: 1 };
          }
        } else {
          defaults[f.id] = '';
        }
      });
    return defaults;
  }, [fields]);

  // 使用 react-hook-form
  type FormValues = Record<
    string,
    string | string[] | { adult: number; child: number } | { total: number }
  >;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: getDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    // 编辑器模式
    if (editorSDK) {
      const worksStore = editorSDK.fullSDK;
      const isRsvp = worksStore.worksDetail.is_rsvp;
      if (!isRsvp) {
        worksStore.api.updateWorksDetail({
          is_rsvp: true,
        });
      }
      // 确保 URL 上带有 form_config_id 参数（若无则追加并替换，不刷新页面）
      if (typeof window !== 'undefined' && typeof router !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('form_config_id')) {
          urlParams.set('form_config_id', String(formConfigId));
          const newUrl = urlParams.toString()
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;
          router.replace(newUrl, { scroll: false });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化联系人ID，并处理专属链接分享逻辑
  useEffect(() => {
    if (isViewerMode && typeof window !== 'undefined') {
      // 优先从 URL 参数读取 contact_id，确保专属链接能精确关联嘉宾
      const urlContactId = searchParams.get('rsvp_contact_id');
      const urlInviteeName = inviteeName; // 从 URL 参数获取的邀请人姓名
      const urlViewed = searchParams.get('rsvp_viewed'); // 链接是否已被查看过

      // 如果是专属链接（有邀请人姓名和联系人ID，且没有 viewed 标记）
      if (urlInviteeName && urlContactId && !urlViewed) {
        // 场景1: 链接首次被打开（没有 viewed 标记）
        // 认为是原始被邀请人A第一次打开
        setContactId(urlContactId);
        setCookie(COOKIE_CONTACT_ID, urlContactId, COOKIE_EXPIRE_DAYS);

        // 在URL上添加 viewed 标记，表示该链接已被查看
        const params = new URLSearchParams(searchParams.toString());
        params.set('rsvp_viewed', 'true');
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
      } else if (urlInviteeName && urlContactId && urlViewed) {
        // 场景2: 链接带有 viewed 标记（已被查看过）
        const existingContactId = getCookie(COOKIE_CONTACT_ID);

        // 如果当前state已经有正确的contactId，说明是刚设置完viewed后的重新执行，直接跳过
        if (contactId === urlContactId) {
          return;
        }

        if (existingContactId === urlContactId) {
          // 是原始被邀请人A再次访问，保持专属链接
          setContactId(urlContactId);
        } else {
          // 不是原始被邀请人（是B通过A的分享打开）
          // 清除所有URL参数，转为公开链接
          const params = new URLSearchParams(searchParams.toString());
          params.delete('rsvp_invitee');
          params.delete('invitee');
          params.delete('name');
          params.delete('rsvp_phone');
          params.delete('rsvp_email');
          params.delete('rsvp_contact_id');
          params.delete('rsvp_viewed');

          // 使用 router.replace 更新 URL，不刷新页面
          const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          router.replace(newUrl, { scroll: false });

          // 如果有现有的 contact_id，使用它
          if (existingContactId) {
            setContactId(existingContactId);
          }
        }
      } else if (urlContactId) {
        // URL 有 contact_id 但没有邀请人姓名，正常设置
        setContactId(urlContactId);
        setCookie(COOKIE_CONTACT_ID, urlContactId, COOKIE_EXPIRE_DAYS);
      } else {
        // 如果 URL 没有 contact_id，从 cookie 读取
        const cid = getCookie(COOKIE_CONTACT_ID);
        if (cid) {
          setContactId(cid);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewerMode, searchParams, inviteeName, router]);

  // 查询是否有提交记录，并判断是否需要记录访问日志
  useEffect(() => {
    if (
      isViewerMode &&
      config?.id &&
      typeof window !== 'undefined' &&
      !hasCheckedFirstVisit
    ) {
      // 对于邀请链接，直接记录访问日志
      if (isInviteeLink && contactId) {
        trpc.rsvp.createActionLog
          .mutate({
            form_config_id: config.id,
            contact_id: contactId,
            action_type: 'view_page',
            user_agent: navigator.userAgent,
            device_type: /Mobile/.test(navigator.userAgent)
              ? 'mobile'
              : 'desktop',
            referer: document.referrer || undefined,
          })
          .catch(() => {
            // 忽略错误，不影响用户体验
          });
        setHasCheckedFirstVisit(true);
      }

      // 查询是否有提交记录（基于 contact_id）
      if (contactId) {
        console.log('contactId1', contactId);
        trpc.rsvp.getMySubmissionByFormConfig
          .query({
            form_config_id: config.id,
            contact_id: contactId,
          })
          .then((data: any) => {
            if (data && data.length > 0) {
              // 有提交记录，显示提交信息页
              const submissions = data as any[];
              const latest = submissions[0];

              setLatestSubmission(latest);
              setSubmitted(true);

              if (latest) {
                setLastSubmissionGroupId(latest.submission_group_id);
                setWillAttend(latest.will_attend);

                // 设置结果消息
                setResultMsg('提交成功');
              }
            } else {
              // 公开链接：如果没有提交记录，说明是首次访问，记录访问日志
              if (!isInviteeLink && config.id) {
                trpc.rsvp.createActionLog
                  .mutate({
                    form_config_id: config.id,
                    // 公开链接首次访问时还没有 contact_id，不传递
                    action_type: 'view_page',
                    user_agent: navigator.userAgent,
                    device_type: /Mobile/.test(navigator.userAgent)
                      ? 'mobile'
                      : 'desktop',
                    referer: document.referrer || undefined,
                  })
                  .catch(() => {
                    // 忽略错误，不影响用户体验
                  });
              }
            }
            setHasCheckedFirstVisit(true);
          })
          .catch(() => {
            // 忽略错误
            setHasCheckedFirstVisit(true);
          });
      } else if (!isInviteeLink && config.id) {
        // 公开链接且没有 contact_id，说明是首次访问，记录访问日志
        trpc.rsvp.createActionLog
          .mutate({
            form_config_id: config.id,
            // 公开链接首次访问时还没有 contact_id，不传递
            action_type: 'view_page',
            user_agent: navigator.userAgent,
            device_type: /Mobile/.test(navigator.userAgent)
              ? 'mobile'
              : 'desktop',
            referer: document.referrer || undefined,
          })
          .catch(() => {
            // 忽略错误，不影响用户体验
          });
        setHasCheckedFirstVisit(true);
      }
    }
  }, [
    isViewerMode,
    config?.id,
    contactId,
    isInviteeLink,
    hasCheckedFirstVisit,
  ]);

  // 当字段变化时，重置表单默认值
  useEffect(() => {
    if (config && fields.length > 0) {
      form.reset(getDefaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, fields.length]);

  const handleSubmit = async (willAttendValue: boolean) => {
    if (!config) return;

    // 公开链接必须填写姓名
    if (!isInviteeLink && !guestName.trim()) {
      setResultMsg('请输入您的姓名');
      return;
    }

    setSubmitting(true);
    setResultMsg(null);
    try {
      // 如果选择出席，需要验证表单并获取表单数据
      let submissionData: Record<string, any> = {};
      if (willAttendValue) {
        // 验证表单
        const isValid = await form.trigger();
        if (!isValid) {
          const errors = form.formState.errors;
          const firstError = Object.values(errors)[0];
          if (firstError?.message) {
            setResultMsg(String(firstError.message));
          } else {
            setResultMsg('请检查表单填写是否正确');
          }
          setSubmitting(false);
          return;
        }
        // 获取表单值
        submissionData = form.getValues();
      }

      // 根据链接类型添加信息
      if (isInviteeLink) {
        // 专属邀请链接：被邀请人信息
        submissionData._inviteeInfo = {
          isGuest: false,
          inviteeName: inviteeName,
          inviteePhone: inviteePhone,
          inviteeEmail: inviteeEmail,
        };
      } else {
        // 公开链接：访客信息
        submissionData._guestInfo = {
          isGuest: true,
          guestName: guestName.trim(),
        };
      }

      // 判断是首次提交还是重新提交
      let result: any;
      if (lastSubmissionGroupId) {
        // 重新提交 - 创建新版本（后端会自动记录 resubmit 日志）
        result = await trpc.rsvp.updateSubmissionVersion.mutate({
          submission_group_id: lastSubmissionGroupId,
          submission_data: submissionData,
          will_attend: willAttendValue, // 传递新的 will_attend 值
          operator_type: 'visitor',
          operator_id: contactId || undefined,
        });
      } else {
        // 首次提交（后端会自动记录 submit 日志）
        result = await trpc.rsvp.createSubmission.mutate({
          form_config_id: config.id!,
          contact_id: isViewerMode && contactId ? contactId : undefined,
          will_attend: willAttendValue,
          submission_data: submissionData,
        });

        // 如果服务器端创建了联系人，从返回结果中获取 contact_id
        const returnedContactId = result?.contact_id;
        if (
          isViewerMode &&
          returnedContactId &&
          returnedContactId !== contactId
        ) {
          setContactId(returnedContactId);
          // 保存到cookie
          setCookie(COOKIE_CONTACT_ID, returnedContactId, COOKIE_EXPIRE_DAYS);
        }

        setLastSubmissionGroupId(result?.submission_group_id || null);
      }

      setWillAttend(willAttendValue);
      setSubmitted(true); // 标记为已提交
      if (config.require_approval) {
        setResultMsg('提交成功，等待审核');
      } else {
        setResultMsg('提交成功');
      }

      // 提交成功后重新加载最新提交记录（无论是首次提交还是重新提交）
      const finalContactId = contactId || result?.contact_id;
      if (isViewerMode && finalContactId && config.id) {
        try {
          const submissionData =
            await trpc.rsvp.getMySubmissionByFormConfig.query({
              form_config_id: config.id,
              contact_id: finalContactId,
            });
          if (submissionData && submissionData.length > 0) {
            const latest = submissionData[0];
            setLatestSubmission(latest);
            // 更新 willAttend 状态以匹配最新的提交记录
            setWillAttend(latest.will_attend);
          }
        } catch {
          // 忽略错误
        }
      }
    } catch (e: any) {
      setResultMsg(String(e?.message || '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = () => {
    // 重置状态，回到表单
    setSubmitted(false);
    setResultMsg(null);
    setWillAttend(null);

    // 如果有最新提交记录，使用其表单值作为默认值
    if (latestSubmission?.submission_data) {
      const submissionData = latestSubmission.submission_data;
      const defaultValues: Record<
        string,
        string | string[] | { adult: number; child: number } | { total: number }
      > = {};

      // 从提交数据中提取表单字段值（只处理启用的字段，排除系统字段）
      fields
        .filter(field => field.enabled !== false)
        .forEach(field => {
          if (submissionData[field.id] !== undefined) {
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
    } else {
      // 没有提交记录，使用默认值
      form.reset(getDefaultValues);
    }
  };

  if (loading) {
    return (
      <div className='w-full py-6 text-center text-sm text-gray-500'>
        正在加载...
      </div>
    );
  }

  if (error) {
    return (
      <div className='w-full py-6 text-center text-red-500 text-sm'>
        {error}
      </div>
    );
  }

  if (!config) {
    return (
      <div className='w-full py-6 text-center text-sm text-gray-500'>
        暂无配置
      </div>
    );
  }

  if (config.enabled === false) {
    return (
      <div className='w-full py-6 text-center text-sm text-gray-500'>
        表单未开启
      </div>
    );
  }

  // 提交成功页面（如果有提交记录或已提交）
  if (submitted && resultMsg) {
    return (
      <div
        style={{
          pointerEvents: editorSDK ? 'none' : 'auto',
        }}
      >
        <SubmissionView
          latestSubmission={latestSubmission}
          onResubmit={handleResubmit}
          allowMultipleSubmit={config.allow_multiple_submit}
          fields={fields}
          inviteeName={inviteeName}
        />
      </div>
    );
  }

  return (
    <>
      <FormCompWrapper
        className='w-full max-w-xl'
        data-form-id={config.id}
        style={{
          pointerEvents: editorSDK ? 'none' : 'auto',
        }}
      >
        {/* Header: 致 XXX 和 消息 */}
        {isInviteeLink && (
          <div className='flex items-center justify-between header bg-gray-50'>
            <div className='text-gray-600'>
              <span className='text-xs'>致</span>
              <span className='font-medium'>{inviteeName}</span>
            </div>
          </div>
        )}

        {/* 公开链接：必须填写姓名 */}
        {!isInviteeLink && (
          <div className='space-y-1 header bg-gray-50'>
            <label className='block text-xs font-medium text-gray-600'>
              您的姓名 <span className='text-red-500'>*</span>
            </label>
            <Input
              type='text'
              placeholder='请输入您的姓名'
              value={guestName}
              onChange={e => {
                setGuestName(e.target.value);
                // 记录姓名填写操作（仅第一次填写时记录）
                if (e.target.value.trim() && !guestName.trim() && config?.id) {
                  trpc.rsvp.createActionLog
                    .mutate({
                      form_config_id: config.id,
                      contact_id: contactId || undefined,
                      action_type: 'view_page', // 使用 view_page 类型，通过 metadata 记录详细操作
                      metadata: {
                        action: 'fill_name',
                        name: e.target.value.trim(),
                      },
                    })
                    .catch(() => {
                      // 忽略错误
                    });
                }
              }}
              className='h-9 border-blue-200'
            />
          </div>
        )}
        <div className='content'>
          {/* 您是否参加？ */}
          <div className='space-y-1'>
            <div className='text-xs font-medium text-gray-600'>
              您是否参加？
            </div>
            {/* 出席/不出席选择按钮 */}
            {!submitting && !resultMsg && (
              <div className='flex items-center gap-2'>
                <Button
                  size='lg'
                  disabled={submitting || (!isInviteeLink && !guestName.trim())}
                  onClick={() => {
                    setWillAttend(true);
                    // 记录选择出席操作
                    if (config?.id) {
                      trpc.rsvp.createActionLog
                        .mutate({
                          form_config_id: config.id,
                          contact_id: contactId || undefined,
                          action_type: 'view_page', // 使用 view_page 类型，通过 metadata 记录详细操作
                          metadata: {
                            action: 'select_attend',
                            will_attend: true,
                          },
                        })
                        .catch(() => {
                          // 忽略错误
                        });
                    }
                  }}
                  className={cn(
                    'flex-1 h-10 rounded-lg font-medium',
                    !willAttend && 'border-2'
                  )}
                  variant={willAttend === true ? 'black' : 'outline'}
                >
                  参加
                </Button>
                <Button
                  size='lg'
                  variant={willAttend === false ? 'black' : 'outline'}
                  disabled={submitting || (!isInviteeLink && !guestName.trim())}
                  onClick={() => {
                    // 记录选择不出席操作
                    if (config?.id) {
                      trpc.rsvp.createActionLog
                        .mutate({
                          form_config_id: config.id,
                          contact_id: contactId || undefined,
                          action_type: 'view_page', // 使用 view_page 类型，通过 metadata 记录详细操作
                          metadata: {
                            action: 'select_attend',
                            will_attend: false,
                          },
                        })
                        .catch(() => {
                          // 忽略错误
                        });
                    }
                    handleSubmit(false);
                  }}
                  className='flex-1 h-10 rounded-lg font-medium border-2'
                >
                  不参加
                </Button>
              </div>
            )}
          </div>

          {/* 如果选择了出席，显示表单 */}
          {willAttend === true && (
            <Form {...form}>
              <form className='pt-3'>
                <RSVPFormFields fields={fields} control={form.control} />
              </form>
            </Form>
          )}

          {resultMsg ? (
            <div className='text-sm text-red-500'>{resultMsg}</div>
          ) : null}

          {/* 如果选择了出席，显示确认按钮 */}
          {willAttend === true && (
            <div className='pt-3'>
              <Button
                size='lg'
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className='w-full h-10 rounded-lg font-medium bg-gray-900 hover:bg-gray-800'
              >
                {submitting ? '提交中...' : '确认'}
              </Button>
              {config.max_submit_count != null ? (
                <div className='text-center mt-2'>
                  <span className='text-xs text-gray-500'>
                    限制 {config.max_submit_count} 次
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </FormCompWrapper>
    </>
  );
}

const RsvpSetting = ({ formConfigId }: { formConfigId: string }) => {
  const { showEditDialog, setShowEditDialog } = useRSVP();
  const { config } = useRSVP();
  return (
    <>
      <div
        id={`hidden_trigger_for_rsvp_config_panel_${formConfigId}`}
        onClick={() => {
          setShowEditDialog(true);
        }}
      ></div>
      <ResponsiveDialog
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
        handleOnly={true}
        fullHeight={true}
      >
        {config ? (
          <RSVPConfigPanel onClose={() => setShowEditDialog(false)} />
        ) : null}
      </ResponsiveDialog>
    </>
  );
};

// 导出组件：使用 Provider 包裹
export default function RSVPComp({ attrs, editorSDK, layer }: RSVPCompProps) {
  return (
    <RSVPProvider attrs={attrs} editorSDK={editorSDK} layer={layer}>
      <RSVPCompInner attrs={attrs} editorSDK={editorSDK} layer={layer} />
      <RsvpSetting formConfigId={attrs.formConfigId} />
    </RSVPProvider>
  );
}
