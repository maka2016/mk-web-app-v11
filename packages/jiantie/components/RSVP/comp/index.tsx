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
const COOKIE_VISITOR_ID = 'rsvp_visitor_id';
const COOKIE_CONTACT_ID = 'rsvp_contact_id';
const COOKIE_EXPIRE_DAYS = 365; // Cookie 有效期1年

// 生成或获取访客ID
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let visitorId = getCookie(COOKIE_VISITOR_ID);
  if (!visitorId) {
    // 生成基于时间戳和随机数的ID
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCookie(COOKIE_VISITOR_ID, visitorId, COOKIE_EXPIRE_DAYS);
  }
  return visitorId;
}

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

  // 判断链接类型：如果有邀请人姓名，则是专属邀请链接；否则是公开链接
  const isInviteeLink = !!inviteeName;

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

  // 访客模式下的访客ID和联系人ID
  const [visitorId, setVisitorId] = useState<string>('');
  const [contactId, setContactId] = useState<string | null>(null);

  const deadlinePassed = useMemo(() => {
    if (!config?.submit_deadline) return false;
    const d = new Date(config.submit_deadline);
    return Date.now() > d.getTime();
  }, [config?.submit_deadline]);

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
            defaults[f.id] = { adult: 0, child: 0 };
          } else {
            defaults[f.id] = { total: 0 };
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
  }, []);

  // 初始化访客ID和联系人ID，并处理专属链接分享逻辑
  useEffect(() => {
    if (isViewerMode && typeof window !== 'undefined') {
      const vid = getOrCreateVisitorId();
      setVisitorId(vid);

      // 优先从 URL 参数读取 contact_id，确保专属链接能精确关联嘉宾
      const urlContactId = searchParams.get('rsvp_contact_id');
      const urlInviteeName = inviteeName; // 从 URL 参数获取的邀请人姓名
      const urlViewed = searchParams.get('rsvp_viewed'); // 链接是否已被查看过

      // 如果是专属链接（有邀请人姓名和联系人ID）
      if (urlInviteeName && urlContactId) {
        const existingContactId = getCookie(COOKIE_CONTACT_ID);

        if (!urlViewed) {
          // 场景1: 链接首次被打开（没有 viewed 标记）
          // 认为是原始被邀请人A第一次打开
          setContactId(urlContactId);
          setCookie(COOKIE_CONTACT_ID, urlContactId, COOKIE_EXPIRE_DAYS);

          // 在URL上添加 viewed 标记，表示该链接已被查看
          const params = new URLSearchParams(searchParams.toString());
          params.set('rsvp_viewed', 'true');
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          router.replace(newUrl, { scroll: false });
        } else {
          // 场景2: 链接带有 viewed 标记（已被查看过）
          // 检查当前设备的 contact_id 是否与链接的 contact_id 匹配
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

  // 记录访问日志（访客打开页面）
  useEffect(() => {
    if (isViewerMode && config?.id && typeof window !== 'undefined') {
      trpc.rsvp.createActionLog
        .mutate({
          form_config_id: config.id,
          contact_id: contactId || undefined,
          visitor_id: visitorId || undefined,
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
  }, [isViewerMode, config?.id, contactId, visitorId]);

  // 查询访客是否有提交记录（如果有则显示提交信息页）
  useEffect(() => {
    if (isViewerMode && config?.id && (visitorId || contactId)) {
      trpc.rsvp.getMySubmissionByFormConfig
        .query({
          form_config_id: config.id,
          visitor_id: visitorId || undefined,
          contact_id: contactId || undefined,
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
          }
        })
        .catch(() => {
          // 忽略错误
        });
    }
  }, [isViewerMode, visitorId, contactId, config?.id]);

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
          operator_type: 'visitor',
          operator_id: contactId || visitorId,
        });
      } else {
        // 首次提交（后端会自动记录 submit 日志）
        result = await trpc.rsvp.createSubmission.mutate({
          form_config_id: config.id!,
          visitor_id: isViewerMode ? visitorId : undefined,
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

      // 提交成功后重新加载最新提交记录
      const finalContactId = contactId || result?.contact_id;
      if (isViewerMode && finalContactId && config.id) {
        try {
          const submissionData =
            await trpc.rsvp.getMySubmissionByFormConfig.query({
              form_config_id: config.id,
              visitor_id: visitorId || undefined,
              contact_id: finalContactId || undefined,
            });
          if (submissionData && submissionData.length > 0) {
            setLatestSubmission(submissionData[0]);
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

  if (deadlinePassed) {
    return (
      <div className='w-full py-6 text-center text-sm text-gray-500'>
        已截止
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
          <div className='space-y-2 header bg-gray-50'>
            <label className='block text-xs font-medium text-gray-900'>
              您的姓名 <span className='text-red-500'>*</span>
            </label>
            <Input
              type='text'
              placeholder='请输入您的姓名'
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
            />
          </div>
        )}
        <div className='content'>
          {/* 您是否参加？ */}
          <div>
            <div className='text-xs font-medium text-gray-600 mb-1'>
              您是否参加？
            </div>
            {/* 出席/不出席选择按钮 */}
            {!submitting && !resultMsg && (
              <div className='flex items-center gap-2'>
                <Button
                  size='lg'
                  disabled={submitting || (!isInviteeLink && !guestName.trim())}
                  onClick={() => setWillAttend(true)}
                  className={cn(
                    'flex-1 h-10 rounded-lg font-medium',
                    !willAttend && 'border-2'
                  )}
                  variant={willAttend === true ? 'default' : 'outline'}
                >
                  参加
                </Button>
                <Button
                  size='lg'
                  variant={willAttend === false ? 'default' : 'outline'}
                  disabled={submitting || (!isInviteeLink && !guestName.trim())}
                  onClick={() => handleSubmit(false)}
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
            <div className='pt-2'>
              <Button
                size='lg'
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className='w-full h-11 rounded-lg font-medium bg-gray-900 hover:bg-gray-800'
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
        contentProps={{
          className: 'h-screen overflow-hidden rounded-none',
        }}
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
