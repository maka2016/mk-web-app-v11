'use client';
import APPBridge from '@/store/app-bridge';
import { trpc } from '@/utils/trpc';
import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@workspace/ui/components/button';
import { Form } from '@workspace/ui/components/form';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as z from 'zod';
import { formatPaddingValue } from '../../GridEditorV3/utils/utils';
import { RSVPConfigPanel } from '../configPanel';
import { RSVPProvider, useRSVP } from '../RSVPContext';
import {
  DEFAULT_RSVP_THEME,
  RSVPAttachmentItem,
  RSVPDisplayMode,
  RSVPField,
  RSVPTheme,
} from '../type';
import { ButtonWithTheme, RSVPFormFields } from './RSVPFormFields';
import { SubmissionView } from './SubmissionView';

// LocalStorage 键名前缀（按表单配置维度存储最近一次提交）
const STORAGE_SUBMISSION_PREFIX = 'rsvp_submission_';

const getSubmissionStorageKey = (formConfigId: string) =>
  `${STORAGE_SUBMISSION_PREFIX}${formConfigId}`;

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
    '--rsvp-control-font-size': `${mergedTheme.controlFontSize ?? DEFAULT_RSVP_THEME.controlFontSize
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
      } else if (field.type === 'attachment') {
        // 附件字段：数组，每项为一个附件对象
        fieldSchema = z.array(
          z.object({
            url: z.string(),
            name: z.string(),
            size: z.number().int().nonnegative(),
            mimeType: z.string().optional(),
          })
        );
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
        } else if (field.type === 'attachment') {
          fieldSchema = (fieldSchema as z.ZodArray<any>).min(
            1,
            `${field.label} 为必填`
          );
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
        } else if (field.type === 'attachment') {
          fieldSchema = (fieldSchema as z.ZodArray<any>).optional().default([]);
        } else {
          fieldSchema = (fieldSchema as z.ZodString).optional().default('');
        }
      }

      schemaShape[field.id] = fieldSchema;
    });

  return z.object(schemaShape);
}

interface RSVPCompProps {
  /** 作品ID，用于关联RSVP配置 */
  worksId: string;
  /** 是否允许创建配置（默认通过URL判断是否是编辑器模式） */
  canCreate?: boolean;
  /** RSVP主题设置（可选） */
  theme?: RSVPTheme;
  displayMode?: RSVPDisplayMode;
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
  display: flex;
  flex-direction: column;

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
    flex: 1;
    overflow-y: auto;
  }
`;

const TriggerButton = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 11;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  pointer-events: none;
`;

// 判断是否是编辑器模式
const isEditorMode = () => {
  if (typeof window === 'undefined') return false;
  return /editor/.test(window.location.href);
};

// 内部组件：负责纯粹的渲染
function RSVPCompInner({
  theme,
  displayMode = 'canvas_trigger',
}: RSVPCompProps) {
  const isEditor = isEditorMode();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showRSVPForm, setShowRSVPForm] = useState(false);
  const rsvp = useRSVP();
  const {
    config,
    configId,
    loading,
    error,
    fields,
    isTemplate,
    setShowEditDialog,
    displayMode: rsvpDisplayMode,
  } = rsvp;

  const isInlineMode = (displayMode || rsvpDisplayMode) === 'inline';

  // 从 context 获取 formConfigId（如果有）
  const formConfigId = configId || undefined;

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

  // 解码 URL 参数，处理可能的双重编码情况
  const decodeParam = (value: string | null): string => {
    if (!value) return '';
    try {
      if (value.includes('%')) {
        return decodeURIComponent(value);
      }
      return value;
    } catch {
      return value;
    }
  };

  // 没有在编辑器时，就是观众模式
  const isViewerMode = !isEditor;

  // URL 中基于字段 id 的默认值映射（例如 name、phone 等）
  const urlDefaultValues = useMemo(() => {
    const defaults: Record<string, any> = {};
    if (!fields || fields.length === 0) return defaults;

    fields
      .filter(f => f.enabled !== false)
      .forEach(field => {
        let raw = searchParams.get(field.id);

        // 兼容历史的 rsvp_invitee / invitee 参数，但正式约定仍然是使用字段 id（如 name）
        if (!raw && field.id === 'name') {
          raw = searchParams.get('rsvp_invitee') || searchParams.get('invitee');
        }

        if (!raw) return;
        const value = decodeParam(raw);

        if (field.type === 'checkbox') {
          // 多选字段：支持逗号/空格分隔
          const parts = value
            .split(/[,，\s]+/)
            .map(v => v.trim())
            .filter(Boolean);
          if (parts.length > 0) {
            defaults[field.id] = parts;
          }
        } else if (field.type === 'guest_count') {
          // 人数字段暂不通过 URL 预填，避免格式混乱
          return;
        } else {
          defaults[field.id] = value;
        }
      });

    return defaults;
  }, [fields, searchParams]);

  // URL 中的姓名字段，用于头部展示“致 XXX”
  const inviteeNameFromUrl = useMemo(() => {
    return decodeParam(
      searchParams.get('name') ||
      searchParams.get('rsvp_invitee') ||
      searchParams.get('invitee')
    );
  }, [searchParams]);

  // 注意：姓名现在通过表单字段系统管理，不再通过 _guestInfo/_inviteeInfo 额外存储

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmissionGroupId, setLastSubmissionGroupId] = useState<
    string | null
  >(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false); // 是否已提交成功
  const [latestSubmission, setLatestSubmission] = useState<any | null>(null); // 最新提交记录
  const [isEditing, setIsEditing] = useState<boolean>(false); // 是否正在编辑回复

  // 动态生成表单 schema
  const formSchema = useMemo(() => {
    if (fields.length === 0) {
      return z.record(z.string(), z.union([z.string(), z.array(z.string())]));
    }
    return createFormSchema(fields);
  }, [fields]);

  // 初始化表单默认值（只处理启用的字段，排除 ask_will_attend），并合并 URL 传入的默认值
  const getDefaultValues = useMemo(() => {
    const defaults: Record<
      string,
      string | string[] | Record<string, number> | RSVPAttachmentItem[]
    > = {};
    fields
      .filter(f => f.enabled !== false && f.id !== 'ask_will_attend')
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
        } else if (f.type === 'attachment') {
          defaults[f.id] = [];
        } else {
          defaults[f.id] = '';
        }
      });

    // 合并来自 URL 的默认值（URL 优先级更高）
    Object.keys(urlDefaultValues).forEach(key => {
      defaults[key] = urlDefaultValues[key];
    });

    return defaults;
  }, [fields, urlDefaultValues]);

  // 使用 react-hook-form
  type FormValues = Record<
    string,
    | string
    | string[]
    | { adult: number; child: number }
    | { total: number }
    | RSVPAttachmentItem[]
  >;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: getDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    // 模板模式：跳过URL更新
    if (isTemplate) {
      return;
    }
    // 编辑器模式：确保 URL 上带有 form_config_id 参数（若无则追加并替换，不刷新页面）
    if (
      isEditor &&
      typeof window !== 'undefined' &&
      typeof router !== 'undefined'
    ) {
      const urlParams = new URLSearchParams(window.location.search);
      // 使用configId或formConfigId，优先使用configId（从context获取的最新值）
      const formConfigIdToUse = configId || formConfigId;
      if (!urlParams.has('form_config_id') && formConfigIdToUse) {
        urlParams.set('form_config_id', String(formConfigIdToUse));
        const newUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId, isTemplate]);

  // 从本地存储中恢复最近一次提交记录（基于 form_config_id）
  useEffect(() => {
    if (!isViewerMode || isTemplate || !config?.id) {
      return;
    }
    const key = getSubmissionStorageKey(String(config.id));
    const stored = getLocalStorage(key);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.submission_data) {
        setLatestSubmission(parsed);
        setLastSubmissionGroupId(parsed.submission_group_id || null);
        setSubmitted(true);
        setResultMsg('提交成功');
      }
    } catch {
      // 忽略解析错误
    }
  }, [config?.id, isTemplate, isViewerMode]);

  // 当字段变化时，重置表单默认值
  useEffect(() => {
    if (config && fields.length > 0) {
      form.reset(getDefaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, fields.length]);

  const handleSubmit = async () => {
    if (!config) return;

    // 模板模式：直接显示成功，不发送请求
    if (isTemplate) {
      setSubmitted(true);
      setResultMsg('提交成功');
      return;
    }
    if (APPBridge.judgeIsInApp()) {
      toast.error('请分享后提交');
      return;
    }

    setSubmitting(true);
    setResultMsg(null);
    try {
      // 验证表单并获取表单数据
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
      const submissionData: Record<string, any> = form.getValues();

      // 判断是首次提交还是重新提交
      let result: any;
      let nextSubmissionGroupId: string | null = lastSubmissionGroupId;

      if (lastSubmissionGroupId) {
        // 重新提交 - 创建新版本（后端会自动记录 resubmit 日志）
        result = await trpc.rsvp.updateSubmissionVersion.mutate({
          submission_group_id: lastSubmissionGroupId,
          submission_data: submissionData,
          will_attend: true, // 默认值
          operator_type: 'visitor',
        });
      } else {
        // 首次提交（后端会自动记录 submit 日志）
        result = await trpc.rsvp.createSubmission.mutate({
          form_config_id: config.id!,
          will_attend: true, // 默认值
          submission_data: submissionData,
        });

        nextSubmissionGroupId = result?.submission_group_id || null;
        setLastSubmissionGroupId(nextSubmissionGroupId);
      }

      setSubmitted(true); // 标记为已提交
      setIsEditing(false); // 重置编辑状态
      if (config.require_approval) {
        setResultMsg('提交成功，等待审核');
      } else {
        setResultMsg('提交成功');
      }

      // 提交成功后，在本地保存最近一次提交记录，便于后续“编辑回复”
      if (isViewerMode && config.id) {
        const localLatest = {
          submission_group_id: nextSubmissionGroupId,
          submission_data: submissionData,
        };
        setLatestSubmission(localLatest);
        const key = getSubmissionStorageKey(String(config.id));
        setLocalStorage(key, JSON.stringify(localLatest));
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

      const defaultValues: Record<
        string,
        string | string[] | { adult: number; child: number } | { total: number }
      > = {};

      // 从提交数据中提取表单字段值（只处理启用的字段）
      fields
        .filter(field => field.enabled !== false)
        .forEach(field => {
          if (submissionData[field.id] !== undefined) {
            // 对于 guest_count 类型，确保成人人数至少为1
            if (field.type === 'guest_count') {
              const value = submissionData[field.id];
              if (field.splitAdultChild && typeof value === 'object') {
                defaultValues[field.id] = {
                  adult: Math.max(1, (value as any).adult || 1),
                  child: (value as any).child || 0,
                };
              } else if (typeof value === 'object') {
                defaultValues[field.id] = {
                  total: Math.max(1, (value as any).total || 1),
                };
              } else {
                // 兼容旧数据格式
                defaultValues[field.id] = field.splitAdultChild
                  ? { adult: 1, child: 0 }
                  : { total: 1 };
              }
            } else if (field.type === 'attachment') {
              const value = submissionData[field.id];
              defaultValues[field.id] = Array.isArray(value) ? value : [];
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
          } else if (field.type === 'attachment') {
            defaultValues[field.id] = [];
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

  // 取消编辑，返回提交成功页面
  const handleCancelEdit = () => {
    if (latestSubmission) {
      setSubmitted(true);
      setResultMsg('提交成功');
      setIsEditing(false);
    }
  };

  if (error && !isTemplate) {
    // 检查是否是配置错误（关联错误）
    const isConfigError =
      error.includes('表单配置异常') || error.includes('关联');

    return (
      <FormCompWrapper
        className='w-full max-w-xl relative max-h-[80vh]'
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

  const renderHeader = () => {
    if (isViewerMode) {
      // viewer 模式下，如果 URL 中提供了 name，则展示“致 XX”
      if (inviteeNameFromUrl) {
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
              <span className='font-bold'>{inviteeNameFromUrl}</span>
            </div>
          </div>
        );
      }
      // 公开链接：姓名字段统一在 RSVPFormFields 中渲染，这里不再单独渲染
      return null;
    }
    return null
    // return (
    //   <div className='flex items-center justify-between header'>
    //     <div
    //       className='text-gray-600 flex gap-2 items-center'
    //       style={{
    //         color: 'var(--rsvp-label-color)',
    //         fontSize: 'var(--rsvp-control-font-size)',
    //       }}
    //     >
    //       <span>致</span>
    //       <span className='font-bold'>宾客姓名</span>
    //     </div>
    //   </div>
    // );
  };

  const renderRsvpFormDOM = () => {
    if (loading) {
      return (
        <div className='w-full py-6 text-center text-sm text-gray-500'>
          正在加载...
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
      if (isEditor) {
        return (
          <div className='w-full py-6 text-center text-sm text-gray-500'>
            表单未开启
          </div>
        );
      }
      return null;
    }

    // 提交成功页面（如果有提交记录或已提交）
    if (submitted && resultMsg) {
      return (
        <SubmissionView
          style={{
            pointerEvents: isEditor ? 'none' : 'auto',
          }}
          latestSubmission={latestSubmission}
          onResubmit={handleResubmit}
          allowMultipleSubmit={config.allow_multiple_submit}
          fields={fields}
          inviteeName={inviteeNameFromUrl}
          themeStyle={cssVariables}
          needsBackdropFilter={!!needsBackdropFilter}
          successFeedbackConfig={config.success_feedback_config}
        />
      );
    }
    return (
      <>
        {isEditor && !isInlineMode && (
          <Button
            onClick={() => {
              setShowEditDialog(true);
            }}
          >
            设置回执
          </Button>
        )}
        <FormCompWrapper
          className='w-full max-w-xl relative max-h-[80vh]'
          data-form-id={config.id}
          data-has-backdrop-filter={needsBackdropFilter ? 'true' : 'false'}
          style={{
            ...cssVariables,
            pointerEvents: isEditor ? 'none' : 'auto',
          }}
        >
          {renderHeader()}
          <div className='content'>
            {/* 表单始终展示，由 RSVPFormFields 根据字段配置统一渲染 */}
            <Form {...form}>
              <form className='pt-3'>
                <RSVPFormFields fields={fields} control={form.control} />
              </form>
            </Form>

            {resultMsg ? (
              <div className='text-sm text-red-500'>{resultMsg}</div>
            ) : null}
          </div>
          {/* 提交按钮：统一提交整个表单（包括是否出席） */}
          <div className='pt-3 sticky bottom-0'>
            <div className='flex gap-3'>
              <ButtonWithTheme
                isPrimary
                disabled={submitting}
                onClick={handleSubmit}
                className='flex-1'
              >
                {submitting ? '提交中...' : '提交'}
              </ButtonWithTheme>
              {/* 编辑模式下显示取消按钮 */}
              {isEditing && (
                <ButtonWithTheme
                  isPrimary={false}
                  disabled={submitting}
                  onClick={handleCancelEdit}
                  variant='outline'
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
        </FormCompWrapper>
      </>
    );
  };

  if (isInlineMode) {
    return renderRsvpFormDOM();
  } else {
    // viewer模式下，渲染一个固定在底部的trigger，点击后弹出rsvpFormDOM
    return (
      <>
        {!isEditor &&
          ReactDOM.createPortal(
            <TriggerButton
              title='填写回执'
              style={{
                ...cssVariables,
              }}
            >
              <ButtonWithTheme
                isPrimary
                onClick={() => setShowRSVPForm(true)}
                className='pointer-events-auto'
              >
                <span>填写表单</span>
                <span className='text-xs'>
                  ({submitted && resultMsg ? '已提交' : '未回复'})
                </span>
              </ButtonWithTheme>
            </TriggerButton>,
            document.body
          )}
        <ResponsiveDialog
          isOpen={showRSVPForm}
          onOpenChange={setShowRSVPForm}
          isDialog={false}
          title='填写表单'
          handleOnly
          className='p-4 pb-8 max-h-[80vh]'
        >
          {renderRsvpFormDOM()}
        </ResponsiveDialog>
      </>
    );
  }
}

const RsvpSetting = () => {
  const { showEditDialog, setShowEditDialog, config, configId } = useRSVP();
  // 使用configId作为唯一标识，如果没有则使用默认值
  return (
    <>
      <div
        id={`hidden_trigger_for_rsvp_config_panel`}
        onClick={() => {
          setShowEditDialog(true);
        }}
      ></div>
      <ResponsiveDialog
        isOpen={showEditDialog}
        onOpenChange={setShowEditDialog}
        handleOnly={true}
        className='max-h-[80vh] overflow-hidden'
      >
        {config ? (
          <RSVPConfigPanel onClose={() => setShowEditDialog(false)} />
        ) : null}
      </ResponsiveDialog>
    </>
  );
};

// 导出组件：使用 Provider 包裹
export default function RSVPComp({
  worksId,
  canCreate,
  theme,
  displayMode,
}: RSVPCompProps) {
  // 如果没有提供 canCreate，则通过 URL 判断是否是编辑器模式
  const isEditor = isEditorMode();
  const canCreateConfig = canCreate ?? isEditor;

  return (
    <RSVPProvider worksId={worksId} canCreate={canCreateConfig}>
      <RSVPCompInner
        worksId={worksId}
        theme={theme}
        canCreate={canCreateConfig}
        displayMode={displayMode}
      />
      <RsvpSetting />
    </RSVPProvider>
  );
}
