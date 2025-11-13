'use client';
import { trpc } from '@/utils/trpc';
import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import APPBridge from '@mk/app-bridge';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Form } from '@workspace/ui/components/form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as z from 'zod';
import { ResponsiveDialog } from '../../Drawer';
import { formatPaddingValue } from '../../GridV3/DesignerToolForEditor/ElementAttrsEditor/utils';
import { RSVPConfigPanel } from '../configPanel';
import { RSVPProvider, useRSVP } from '../RSVPContext';
import { DEFAULT_RSVP_THEME, RSVPAttrs, RSVPField, RSVPTheme } from '../type';
import {
  ButtonWithTheme,
  InputWithTheme,
  RSVPFormFields,
} from './RSVPFormFields';
import { SubmissionView } from './SubmissionView';

// LocalStorage 键名
const STORAGE_CONTACT_ID = 'rsvp_contact_id';

// LocalStorage 辅助函数
const getLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // 忽略错误（如隐私模式下无法使用 localStorage）
  }
};

/**
 * 将主题配置转换为 CSS 变量
 */
function themeToCSSVariables(theme: RSVPTheme): React.CSSProperties {
  const mergedTheme = {
    ...DEFAULT_RSVP_THEME,
    ...theme,
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
    '--rsvp-control-padding': `${formatPaddingValue(
      String(mergedTheme.controlPadding ?? DEFAULT_RSVP_THEME.controlPadding)
    )}`,
    '--rsvp-header-padding': `${formatPaddingValue(
      String(mergedTheme.headerPadding ?? DEFAULT_RSVP_THEME.headerPadding)
    )}`,
    '--rsvp-content-padding': `${formatPaddingValue(
      String(mergedTheme.contentPadding ?? DEFAULT_RSVP_THEME.contentPadding)
    )}`,
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
            adult: z.number().int().min(1, '成人人数不能小于1'),
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
          // 成人人数至少为1
          if (field.splitAdultChild) {
            fieldSchema = (fieldSchema as z.ZodObject<any>).refine(
              (val: any) => val.adult >= 1,
              {
                message: `${field.label} 成人人数至少需要1人`,
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
              .default({ adult: 1, child: 0 });
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
  background-color: var(--rsvp-bg-color);
  box-shadow: var(--rsvp-box-shadow);
  border-radius: var(--rsvp-border-radius);
  border: var(--rsvp-border-width, 0px) solid
    var(--rsvp-border-color, transparent);
  font-size: var(--rsvp-control-font-size, 14px);
  overflow: hidden;
  position: relative;
  z-index: 11;

  /* 使用配置的 backdrop-filter 值 */
  backdrop-filter: var(--rsvp-backdrop-filter, none);
  -webkit-backdrop-filter: var(--rsvp-backdrop-filter, none);

  .header {
    padding: var(--rsvp-header-padding, '8px 16px');
    /* border-bottom: 1px solid var(--rsvp-border-color, #e5e7eb); */
    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.1);
  }
  .content {
    padding: var(--rsvp-content-padding, '16px');
  }
`;

// 内部组件：负责纯粹的渲染
function RSVPCompInner({ attrs, editorSDK }: RSVPCompProps) {
  const { formConfigId, theme } = attrs;
  const searchParams = useSearchParams();
  const router = useRouter();
  const rsvp = useRSVP();
  const { config, loading, error, fields, isTemplate } = rsvp;

  // 合并主题设置，使用默认值填充缺失的项
  const mergedTheme = useMemo(() => {
    return {
      ...DEFAULT_RSVP_THEME,
      ...(theme || {}),
    };
  }, [theme]);

  // 将主题转换为 CSS 变量
  const cssVariables = useMemo(() => {
    return themeToCSSVariables(theme || {});
  }, [theme]);

  // 检查是否需要应用 backdrop-filter（基于配置的值）
  const needsBackdropFilter = useMemo(() => {
    const backdropFilter = mergedTheme.backdropFilter;
    return (
      backdropFilter &&
      typeof backdropFilter === 'string' &&
      backdropFilter !== 'none' &&
      backdropFilter.trim() !== ''
    );
  }, [mergedTheme.backdropFilter]);

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
  const isEditorMode = !!editorSDK;

  // 判断链接类型：使用 state 保存，避免 URL 参数变化导致判断失效
  // 初始化时根据 URL 参数判断（首次打开时没有 viewed 标记）
  const [isInviteeLink, setIsInviteeLink] = useState<boolean>(() => {
    if (isViewerMode) {
      const urlContactId = searchParams.get('rsvp_contact_id');
      const urlViewed = searchParams.get('rsvp_viewed');
      // 如果有邀请人姓名和 contact_id，且没有 viewed 标记，则是邀请链接
      return !!inviteeName && !!urlContactId && !urlViewed;
    }
    // 编辑器模式，根据是否有邀请人姓名判断
    return !!inviteeName;
  });

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
  const [isEditing, setIsEditing] = useState<boolean>(false); // 是否正在编辑回复

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
        setLocalStorage(STORAGE_CONTACT_ID, urlContactId);
        setIsInviteeLink(true); // 设置为邀请链接

        // 在URL上添加 viewed 标记，表示该链接已被查看
        const params = new URLSearchParams(searchParams.toString());
        params.set('rsvp_viewed', 'true');
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
      } else if (urlInviteeName && urlContactId && urlViewed) {
        // 场景2: 链接带有 viewed 标记（已被查看过）
        const existingContactId = getLocalStorage(STORAGE_CONTACT_ID);

        // 如果当前state已经有正确的contactId，说明是刚设置完viewed后的重新执行
        // 但仍需要确保 isInviteeLink 状态正确
        if (contactId === urlContactId) {
          setIsInviteeLink(true); // 确保保持为邀请链接
          return;
        }

        if (existingContactId === urlContactId) {
          // 是原始被邀请人A再次访问，保持专属链接
          setContactId(urlContactId);
          setIsInviteeLink(true); // 保持为邀请链接
        } else {
          // 不是原始被邀请人（是B通过A的分享打开）
          // 清除所有URL参数，转为公开链接
          setIsInviteeLink(false); // 转为公开链接
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
        setLocalStorage(STORAGE_CONTACT_ID, urlContactId);
        setIsInviteeLink(false); // 没有邀请人姓名，不是邀请链接
      } else {
        // 如果 URL 没有 contact_id，从 localStorage 读取
        const cid = getLocalStorage(STORAGE_CONTACT_ID);
        if (cid) {
          setContactId(cid);
        }
        setIsInviteeLink(false); // 没有邀请人信息，不是邀请链接
      }
    } else {
      // 编辑器模式，根据是否有邀请人姓名判断
      setIsInviteeLink(!!inviteeName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewerMode, searchParams, inviteeName, router]);

  // 查询是否有提交记录，并判断是否需要记录访问日志
  useEffect(() => {
    if (isViewerMode && config?.id && typeof window !== 'undefined') {
      const urlViewed = searchParams.get('rsvp_viewed');

      // 判断是否需要查询提交记录：
      // 1. 首次访问（!hasCheckedFirstVisit）
      // 2. 或者 contactId 存在且 URL 有 viewed=true（嘉宾再次访问链接）
      const shouldQuerySubmission =
        !hasCheckedFirstVisit ||
        (contactId && urlViewed === 'true' && isInviteeLink);

      // 对于邀请链接，直接记录访问日志（只在首次访问时记录）
      if (isInviteeLink && contactId && !hasCheckedFirstVisit) {
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
      if (contactId && shouldQuerySubmission) {
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
              // 如果没有提交记录，且是首次访问，记录访问日志
              if (!hasCheckedFirstVisit) {
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
                setHasCheckedFirstVisit(true);
              }
            }
            // 只有在首次访问时才设置 hasCheckedFirstVisit
            if (!hasCheckedFirstVisit) {
              setHasCheckedFirstVisit(true);
            }
          })
          .catch(() => {
            // 忽略错误
            if (!hasCheckedFirstVisit) {
              setHasCheckedFirstVisit(true);
            }
          });
      } else if (!isInviteeLink && config.id && !hasCheckedFirstVisit) {
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
    searchParams,
  ]);

  // 当字段变化时，重置表单默认值
  useEffect(() => {
    if (config && fields.length > 0) {
      form.reset(getDefaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, fields.length]);

  // 编辑器模式下，自动设置 willAttend 为 true，以便显示表单
  useEffect(() => {
    if (isEditorMode && willAttend === null) {
      setWillAttend(true);
    }
  }, [isEditorMode, willAttend]);

  const handleSubmit = async (willAttendValue: boolean) => {
    if (!config) return;
    if (isTemplate || APPBridge.judgeIsInApp()) {
      toast.error('请分享后提交');
      return;
    }

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
          // 保存到 localStorage
          setLocalStorage(STORAGE_CONTACT_ID, returnedContactId);
        }

        setLastSubmissionGroupId(result?.submission_group_id || null);
      }

      setWillAttend(willAttendValue);
      setSubmitted(true); // 标记为已提交
      setIsEditing(false); // 重置编辑状态
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
    setIsEditing(true); // 标记为编辑模式

    // 如果有最新提交记录，使用其表单值作为默认值
    if (latestSubmission?.submission_data) {
      const submissionData = latestSubmission.submission_data;

      // 恢复 willAttend 状态
      setWillAttend(latestSubmission.will_attend);

      // 如果是公开链接，恢复访客姓名
      if (!isInviteeLink && submissionData._guestInfo?.guestName) {
        setGuestName(submissionData._guestInfo.guestName);
      }

      const defaultValues: Record<
        string,
        string | string[] | { adult: number; child: number } | { total: number }
      > = {};
      console.log('fields', fields);

      // 从提交数据中提取表单字段值（只处理启用的字段，排除系统字段）
      fields
        .filter(field => field.enabled !== false)
        .forEach(field => {
          if (submissionData[field.id] !== undefined) {
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

      console.log('defaultValues', defaultValues);
      form.reset(defaultValues);
    } else {
      // 没有提交记录，使用默认值
      setWillAttend(null);
      form.reset(getDefaultValues);
    }
  };

  // 取消编辑，返回提交成功页面
  const handleCancelEdit = () => {
    if (latestSubmission) {
      setSubmitted(true);
      setWillAttend(latestSubmission.will_attend);
      setResultMsg('提交成功');
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className='w-full py-6 text-center text-sm text-gray-500'>
        正在加载...
      </div>
    );
  }

  if (error && !isTemplate) {
    // 检查是否是配置错误（关联错误）
    const isConfigError =
      error.includes('表单配置异常') || error.includes('关联');

    return (
      <FormCompWrapper
        className='w-full max-w-xl'
        style={{
          ...cssVariables,
          pointerEvents: 'auto',
        }}
      >
        <div className='p-6 space-y-4'>
          <div className='flex flex-col items-center text-center space-y-3'>
            {/* 错误图标 */}
            <div className='w-12 h-12 rounded-full bg-red-100 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-red-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>

            {/* 错误标题 */}
            <h3
              className='text-lg font-semibold'
              style={{ color: 'var(--rsvp-text-color)' }}
            >
              {isConfigError ? '表单配置错误' : '加载失败'}
            </h3>

            {/* 错误信息 */}
            <p className='text-sm text-red-600 leading-relaxed max-w-md'>
              {error}
            </p>

            {/* 配置错误的额外说明 */}
            {isConfigError && (
              <div className='mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
                <p className='text-xs text-yellow-800 text-left space-y-1'>
                  <span className='block font-medium'>可能的原因：</span>
                  <span className='block'>
                    • 作品被复制后，表单配置未正确关联
                  </span>
                  <span className='block'>• 原作品已被删除或移动</span>
                  <span className='block mt-2 font-medium'>解决方法：</span>
                  <span className='block'>
                    请在编辑器中重新打开此作品，系统将自动修复配置
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </FormCompWrapper>
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
          themeStyle={cssVariables}
          needsBackdropFilter={!!needsBackdropFilter}
        />
      </div>
    );
  }

  const renderHeader = () => {
    if (isViewerMode) {
      if (isInviteeLink) {
        /* Header: 致 XXX 和 消息 */
        return (
          <div className='flex items-center justify-between header'>
            <div
              className='text-gray-600 flex gap-2 items-center'
              style={{
                color: 'var(--rsvp-label-color)',
                fontSize: 'var(--rsvp-control-font-size)',
              }}
            >
              <span>致</span>
              <span className='font-bold'>{inviteeName}</span>
            </div>
          </div>
        );
      } else {
        return (
          <div className='space-y-1 header'>
            <label
              className='block font-medium text-gray-600'
              style={{
                color: 'var(--rsvp-label-color)',
                fontSize: 'var(--rsvp-control-font-size)',
              }}
            >
              您的姓名 <span className='text-red-500'>*</span>
            </label>
            <InputWithTheme
              type='text'
              placeholder='请输入您的姓名'
              value={guestName}
              onChange={e => {
                setGuestName(e.target.value);
                // 记录姓名填写操作（仅第一次填写时记录）
                if (
                  e.target.value.trim() &&
                  !guestName.trim() &&
                  config?.id &&
                  isViewerMode
                ) {
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
            />
          </div>
        );
      }
    }
    return (
      <div className='flex items-center justify-between header'>
        <div
          className='text-gray-600 flex gap-2 items-center'
          style={{
            color: 'var(--rsvp-label-color)',
            fontSize: 'var(--rsvp-control-font-size)',
          }}
        >
          <span>致</span>
          <span className='font-bold'>宾客姓名</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <FormCompWrapper
        className='w-full max-w-xl'
        data-form-id={config.id}
        data-has-backdrop-filter={needsBackdropFilter ? 'true' : 'false'}
        style={{
          ...cssVariables,
          pointerEvents: editorSDK ? 'none' : 'auto',
        }}
      >
        {renderHeader()}
        <div className='content'>
          {/* 您是否参加？ */}
          <div className='space-y-1'>
            <div
              className='font-medium'
              style={{
                color: 'var(--rsvp-label-color)',
                fontSize: 'var(--rsvp-control-font-size)',
              }}
            >
              您是否出席？
            </div>
            {/* 出席/不出席选择按钮 */}
            {!submitting && !resultMsg && (
              <div className='flex gap-2'>
                <ButtonWithTheme
                  disabled={
                    isEditorMode
                      ? false
                      : submitting || (!isInviteeLink && !guestName.trim())
                  }
                  onClick={() => {
                    setWillAttend(true);
                    // 记录选择出席操作
                    if (config?.id && isViewerMode) {
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
                  style={{
                    backgroundColor:
                      willAttend === true
                        ? 'var(--rsvp-primary-btn-color)'
                        : 'var(--rsvp-secondary-btn-color)',
                    color:
                      willAttend === true
                        ? 'var(--rsvp-primary-btn-text-color)'
                        : 'var(--rsvp-secondary-btn-text-color)',
                    borderColor:
                      willAttend === true
                        ? 'var(--rsvp-primary-btn-color)'
                        : 'var(--rsvp-secondary-btn-border-color)',
                  }}
                  className='flex-1'
                  variant={willAttend === true ? 'default' : 'outline'}
                >
                  出席
                </ButtonWithTheme>
                <ButtonWithTheme
                  disabled={
                    isEditorMode
                      ? false
                      : submitting || (!isInviteeLink && !guestName.trim())
                  }
                  onClick={() => {
                    // 记录选择不出席操作
                    if (config?.id && isViewerMode) {
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
                  style={{
                    backgroundColor:
                      willAttend === false
                        ? 'var(--rsvp-primary-btn-color)'
                        : 'var(--rsvp-secondary-btn-color)',
                    color:
                      willAttend === false
                        ? 'var(--rsvp-primary-btn-text-color)'
                        : 'var(--rsvp-secondary-btn-text-color)',
                    borderColor:
                      willAttend === false
                        ? 'var(--rsvp-primary-btn-color)'
                        : 'var(--rsvp-secondary-btn-border-color)',
                  }}
                  className='flex-1'
                  variant={willAttend === false ? 'default' : 'outline'}
                >
                  不出席
                </ButtonWithTheme>
              </div>
            )}
          </div>

          {/* 如果选择了出席，或者在编辑器模式下，显示表单 */}
          {config.collect_form && (willAttend === true || isEditorMode) && (
            <Form {...form}>
              <form className='pt-3'>
                <RSVPFormFields fields={fields} control={form.control} />
              </form>
            </Form>
          )}

          {resultMsg ? (
            <div className='text-sm text-red-500'>{resultMsg}</div>
          ) : null}

          {/* 如果选择了出席，或者在编辑器模式下，显示确认按钮 */}
          {(willAttend === true || isEditorMode) && (
            <div className='pt-3'>
              <div className='flex gap-3'>
                <ButtonWithTheme
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                  className='flex-1'
                  style={{
                    borderColor: 'var(--rsvp-primary-btn-color)',
                    backgroundColor: 'var(--rsvp-primary-btn-color)',
                    color: 'var(--rsvp-primary-btn-text-color)',
                  }}
                >
                  {submitting ? '提交中...' : '提交'}
                </ButtonWithTheme>
                {/* 编辑模式下显示取消按钮 */}
                {isEditing && (
                  <ButtonWithTheme
                    disabled={submitting}
                    onClick={handleCancelEdit}
                    variant='outline'
                    style={{
                      borderColor: 'var(--rsvp-secondary-btn-border-color)',
                      backgroundColor: 'var(--rsvp-secondary-btn-color)',
                      color: 'var(--rsvp-secondary-btn-text-color)',
                    }}
                  >
                    取消
                  </ButtonWithTheme>
                )}
              </div>
              {config.max_submit_count != null ? (
                <div className='text-center mt-2'>
                  <span
                    className='text-xs'
                    style={{
                      color: 'var(--rsvp-label-color)',
                    }}
                  >
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
