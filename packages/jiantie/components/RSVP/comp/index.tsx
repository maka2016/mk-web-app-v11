'use client';
import { getCookie, setCookie } from '@/components/viewer/utils/helper';
import { trpc } from '@/utils/trpc';
import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { Minus, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ResponsiveDialog } from '../../Drawer';
import { RSVPConfigPanel } from '../configPanel';
import { RSVPProvider, useRSVP } from '../RSVPContext';
import { RSVPAttrs, RSVPField } from '../type';
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
function createFormSchema(fields: RSVPField[]) {
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
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 10px;
`;

// 内部组件：负责纯粹的渲染
function RSVPCompInner({ attrs, editorSDK }: RSVPCompProps) {
  const { formConfigId } = attrs;
  const searchParams = useSearchParams();
  const rsvp = useRSVP();
  const { config, loading, error, fields, showEditDialog, setShowEditDialog } =
    rsvp;

  // 从 URL 参数获取被邀请人姓名
  const inviteeName =
    searchParams.get('invitee') || searchParams.get('name') || '';

  // 没有在编辑器时，就是访客模式，需要根据访客的设备生成访客的ID
  const isViewerMode = !editorSDK;

  // 区分是被邀请人（invitee）还是公开访客（guest）
  const [isGuest, setIsGuest] = useState<boolean>(false);
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

  // 初始化访客ID和联系人ID（仅在访客模式下）
  useEffect(() => {
    if (isViewerMode && typeof window !== 'undefined') {
      const vid = getOrCreateVisitorId();
      setVisitorId(vid);

      const cid = getCookie(COOKIE_CONTACT_ID);
      if (cid) {
        setContactId(cid);
      }
    }
  }, [isViewerMode]);

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

            // 如果有 contact_id，更新状态
            if (latest?.contact_id && latest.contact_id !== contactId) {
              setContactId(latest.contact_id);
              setCookie(
                COOKIE_CONTACT_ID,
                latest.contact_id,
                COOKIE_EXPIRE_DAYS
              );
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

  // 显示标题：被邀请人显示「诚邀{姓名}」，公开访客显示配置的标题
  const displayTitle = useMemo(() => {
    if (!config) return '';
    if (isGuest) {
      return config.title; // 公开访客显示原配置标题
    }
    // 被邀请人显示「诚邀{姓名}」
    if (inviteeName) {
      return `诚邀${inviteeName}`;
    }
    return config.title; // 如果没有邀请人姓名，显示配置的标题
  }, [isGuest, inviteeName, config]);

  const handleSubmit = async (willAttendValue: boolean) => {
    if (!config) return;

    // 公开访客必须填写姓名
    if (isGuest && !guestName.trim()) {
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

      // 如果是公开访客，添加访客信息
      if (isGuest) {
        submissionData._guestInfo = {
          isGuest: true,
          guestName: guestName.trim(),
          originalInvitee: inviteeName, // 记录原始被邀请人
        };
      } else if (inviteeName) {
        // 被邀请人信息
        submissionData._inviteeInfo = {
          isGuest: false,
          inviteeName: inviteeName,
        };
      }

      const created = await trpc.rsvp.createSubmission.mutate({
        form_config_id: config.id!,
        visitor_id: isViewerMode ? visitorId : undefined,
        contact_id: isViewerMode ? contactId || undefined : undefined,
        will_attend: willAttendValue,
        submission_data: submissionData,
      });

      // 如果服务器端创建了联系人，从返回结果中获取 contact_id
      const returnedContactId = (created as any)?.contact_id;
      if (
        isViewerMode &&
        returnedContactId &&
        returnedContactId !== contactId
      ) {
        setContactId(returnedContactId);
        // 保存到cookie
        setCookie(COOKIE_CONTACT_ID, returnedContactId, COOKIE_EXPIRE_DAYS);
      }

      setLastSubmissionGroupId((created as any)?.submission_group_id || null);
      setWillAttend(willAttendValue);
      setSubmitted(true); // 标记为已提交
      if (config.require_approval) {
        setResultMsg('提交成功，等待审核');
      } else {
        setResultMsg('提交成功');
      }

      // 提交成功后重新加载最新提交记录
      const finalContactId = returnedContactId || contactId;
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
          resultMsg={resultMsg}
          latestSubmission={latestSubmission}
          onResubmit={handleResubmit}
          allowMultipleSubmit={config.allow_multiple_submit}
          fields={fields}
        />
      </div>
    );
  }

  return (
    <>
      <FormCompWrapper
        className='w-full max-w-xl mx-auto space-y-4'
        style={{
          pointerEvents: editorSDK ? 'none' : 'auto',
        }}
      >
        <div>
          <div className='text-lg font-medium'>{displayTitle}</div>
          {config.desc ? (
            <div className='text-sm text-gray-500 mt-1'>{config.desc}</div>
          ) : null}
          {/* 如果有被邀请人姓名且不是公开访客，显示「不是本人」按钮 */}
          {inviteeName && !isGuest && !submitting && !resultMsg && (
            <div className='mt-2'>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setIsGuest(true)}
                className='text-xs text-gray-500'
              >
                不是本人？
              </Button>
            </div>
          )}
        </div>

        {/* 如果是公开访客，显示姓名输入框 */}
        {isGuest && (
          <div className='space-y-2'>
            <label className='block text-sm font-medium'>
              您的姓名 <span className='text-red-500'>*</span>
            </label>
            <input
              className='w-full border rounded px-3 py-2 text-sm'
              type='text'
              placeholder='请输入您的姓名'
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
            />
          </div>
        )}

        {/* 出席/不出席选择按钮始终显示 */}
        {!submitting && !resultMsg && (
          <div className='flex items-center gap-3 pt-2'>
            <Button
              size='lg'
              disabled={submitting || (isGuest && !guestName.trim())}
              onClick={() => setWillAttend(true)}
              className='flex-1'
              variant={willAttend === true ? 'default' : 'outline'}
            >
              出席
            </Button>
            <Button
              size='lg'
              variant={willAttend === false ? 'secondary' : 'outline'}
              disabled={submitting || (isGuest && !guestName.trim())}
              onClick={() => handleSubmit(false)}
              className='flex-1'
            >
              不出席
            </Button>
          </div>
        )}

        {/* 如果选择了出席，显示表单 */}
        {willAttend === true && (
          <Form {...form}>
            <form className='space-y-4'>
              {fields
                .filter(field => field.enabled !== false)
                .map(field => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={field.id}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>
                          {field.label}
                          {field.required ? (
                            <span className='text-red-500 ml-1'>*</span>
                          ) : null}
                        </FormLabel>
                        <FormControl>
                          {field.type === 'text' ? (
                            <Input
                              placeholder={field.placeholder}
                              value={formField.value as string}
                              onChange={formField.onChange}
                              onBlur={formField.onBlur}
                              name={formField.name}
                              ref={formField.ref}
                            />
                          ) : field.type === 'radio' ? (
                            <RadioGroup
                              value={formField.value as string}
                              onValueChange={formField.onChange}
                            >
                              <div className='space-y-2'>
                                {field.options?.map(opt => (
                                  <div
                                    key={opt.value}
                                    className='flex items-center gap-2'
                                  >
                                    <RadioGroupItem
                                      value={opt.value}
                                      id={`${field.id}-${opt.value}`}
                                    />
                                    <label
                                      htmlFor={`${field.id}-${opt.value}`}
                                      className='text-sm cursor-pointer'
                                    >
                                      {opt.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </RadioGroup>
                          ) : field.type === 'checkbox' ? (
                            <div className='space-y-2'>
                              {field.options?.map(opt => (
                                <div
                                  key={opt.value}
                                  className='flex items-center gap-2'
                                >
                                  <Checkbox
                                    id={`${field.id}-${opt.value}`}
                                    checked={(
                                      formField.value as string[]
                                    ).includes(opt.value)}
                                    onCheckedChange={checked => {
                                      const currentValue =
                                        (formField.value as string[]) || [];
                                      if (checked) {
                                        formField.onChange([
                                          ...currentValue,
                                          opt.value,
                                        ]);
                                      } else {
                                        formField.onChange(
                                          currentValue.filter(
                                            v => v !== opt.value
                                          )
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`${field.id}-${opt.value}`}
                                    className='text-sm cursor-pointer'
                                  >
                                    {opt.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : field.type === 'guest_count' ? (
                            <div className='space-y-3'>
                              {field.splitAdultChild ? (
                                <div className='flex items-center gap-4'>
                                  <div className='flex-1'>
                                    <label className='block text-sm font-medium mb-1'>
                                      大人
                                    </label>
                                    <div className='flex items-center gap-1.5'>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='h-8 w-8 shrink-0'
                                        onClick={() => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          const newAdult = Math.max(
                                            0,
                                            (currentValue.adult || 0) - 1
                                          );
                                          formField.onChange({
                                            ...currentValue,
                                            adult: newAdult,
                                          });
                                        }}
                                      >
                                        <Minus className='h-3.5 w-3.5' />
                                      </Button>
                                      <Input
                                        type='number'
                                        min={0}
                                        placeholder='0'
                                        className='text-center flex-1 min-w-0'
                                        value={
                                          (
                                            formField.value as {
                                              adult: number;
                                              child: number;
                                            }
                                          )?.adult || 0
                                        }
                                        onChange={e => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          formField.onChange({
                                            ...currentValue,
                                            adult:
                                              parseInt(e.target.value) || 0,
                                          });
                                        }}
                                      />
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='h-8 w-8 shrink-0'
                                        onClick={() => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          formField.onChange({
                                            ...currentValue,
                                            adult:
                                              (currentValue.adult || 0) + 1,
                                          });
                                        }}
                                      >
                                        <Plus className='h-3.5 w-3.5' />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className='flex-1'>
                                    <label className='block text-sm font-medium mb-1'>
                                      小孩
                                    </label>
                                    <div className='flex items-center gap-1.5'>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='h-8 w-8 shrink-0'
                                        onClick={() => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          const newChild = Math.max(
                                            0,
                                            (currentValue.child || 0) - 1
                                          );
                                          formField.onChange({
                                            ...currentValue,
                                            child: newChild,
                                          });
                                        }}
                                      >
                                        <Minus className='h-3.5 w-3.5' />
                                      </Button>
                                      <Input
                                        type='number'
                                        min={0}
                                        placeholder='0'
                                        className='text-center flex-1 min-w-0'
                                        value={
                                          (
                                            formField.value as {
                                              adult: number;
                                              child: number;
                                            }
                                          )?.child || 0
                                        }
                                        onChange={e => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          formField.onChange({
                                            ...currentValue,
                                            child:
                                              parseInt(e.target.value) || 0,
                                          });
                                        }}
                                      />
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='h-8 w-8 shrink-0'
                                        onClick={() => {
                                          const currentValue =
                                            (formField.value as {
                                              adult: number;
                                              child: number;
                                            }) || { adult: 0, child: 0 };
                                          formField.onChange({
                                            ...currentValue,
                                            child:
                                              (currentValue.child || 0) + 1,
                                          });
                                        }}
                                      >
                                        <Plus className='h-3.5 w-3.5' />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className='flex items-center gap-2'>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className='h-9 w-9 shrink-0'
                                    onClick={() => {
                                      const currentValue = (formField.value as {
                                        total: number;
                                      }) || { total: 0 };
                                      const newTotal = Math.max(
                                        0,
                                        (currentValue.total || 0) - 1
                                      );
                                      formField.onChange({
                                        total: newTotal,
                                      });
                                    }}
                                  >
                                    <Minus className='h-4 w-4' />
                                  </Button>
                                  <Input
                                    type='number'
                                    min={0}
                                    placeholder='请输入人数'
                                    className='text-center flex-1'
                                    value={
                                      (formField.value as { total: number })
                                        ?.total || 0
                                    }
                                    onChange={e => {
                                      formField.onChange({
                                        total: parseInt(e.target.value) || 0,
                                      });
                                    }}
                                  />
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className='h-9 w-9 shrink-0'
                                    onClick={() => {
                                      const currentValue = (formField.value as {
                                        total: number;
                                      }) || { total: 0 };
                                      formField.onChange({
                                        total: (currentValue.total || 0) + 1,
                                      });
                                    }}
                                  >
                                    <Plus className='h-4 w-4' />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
            </form>
          </Form>
        )}

        {resultMsg ? (
          <div className='text-sm text-gray-600'>{resultMsg}</div>
        ) : null}

        {/* 如果选择了出席，显示提交按钮 */}
        {willAttend === true && (
          <div className='flex items-center gap-3 pt-2'>
            <Button
              size='sm'
              disabled={submitting}
              onClick={() => handleSubmit(true)}
            >
              {submitting ? '提交中...' : '提交'}
            </Button>
            {config.max_submit_count != null ? (
              <span className='text-xs text-gray-500'>
                限制 {config.max_submit_count} 次
              </span>
            ) : null}
          </div>
        )}
        <div
          id={`hidden_trigger_for_rsvp_config_panel_${formConfigId}`}
          onClick={() => {
            setShowEditDialog(true);
          }}
        ></div>
      </FormCompWrapper>
      <ResponsiveDialog
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
      >
        {config ? <RSVPConfigPanel /> : null}
      </ResponsiveDialog>
    </>
  );
}

// 导出组件：使用 Provider 包裹
export default function RSVPComp({ attrs, editorSDK, layer }: RSVPCompProps) {
  return (
    <RSVPProvider attrs={attrs} editorSDK={editorSDK} layer={layer}>
      <RSVPCompInner attrs={attrs} editorSDK={editorSDK} layer={layer} />
    </RSVPProvider>
  );
}
