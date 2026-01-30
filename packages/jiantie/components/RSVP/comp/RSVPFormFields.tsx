'use client';
import { cdnApi, startupStsOssClient, uploadFileToOSS } from '@/services';
import { getFileExtendingName } from '@/utils/helper';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import { CheckSquare2, Circle, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Control } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useRSVP } from '../RSVPContext';
import { RSVPAttachmentItem, RSVPField } from '../type';
import { AddressSelector } from './AddressSelector';

interface RSVPFormFieldsProps {
  fields: RSVPField[];
  control: Control<any>;
  className?: string;
  disabled?: boolean;
}

/**
 * 计数器控制组件 - 统一管理人数计数器的样式和行为
 */

interface CounterControlProps {
  className?: string;
  value: number;
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export const InputWithTheme = styled(Input)`
  font-size: var(--rsvp-control-font-size);
  padding-top: var(--rsvp-control-padding);
  padding-bottom: var(--rsvp-control-padding);
  padding-left: calc(var(--rsvp-control-padding) * 1.5);
  padding-right: calc(var(--rsvp-control-padding) * 1.5);
  border-radius: var(--rsvp-border-radius);
  border-width: var(--rsvp-border-width);
  border-style: solid;
  background-color: var(--rsvp-input-bg-color);
  border-color: var(--rsvp-input-border-color);
  color: var(--rsvp-input-text-color);
  ::placeholder {
    color: var(--rsvp-input-placeholder-color);
    font-size: var(--rsvp-control-font-size);
  }
`;

interface ButtonWithThemeProps {
  isPrimary?: boolean;
}

export const ButtonWithTheme = styled(Button, {
  shouldForwardProp: prop => prop !== 'isPrimary',
})<ButtonWithThemeProps>`
  font-size: var(--rsvp-control-font-size);
  padding-top: var(--rsvp-control-padding);
  padding-bottom: var(--rsvp-control-padding);
  padding-left: calc(var(--rsvp-control-padding) * 1.25);
  padding-right: calc(var(--rsvp-control-padding) * 1.25);
  line-height: calc(var(--rsvp-control-font-size) * 1.2);
  border-radius: var(--rsvp-border-radius);
  border-width: var(--rsvp-border-width);
  border-style: solid;
  background-color: ${({ isPrimary }) =>
    isPrimary
      ? 'var(--rsvp-primary-btn-color)'
      : 'var(--rsvp-secondary-btn-color)'};
  border-color: ${({ isPrimary }) =>
    isPrimary
      ? 'var(--rsvp-primary-btn-color)'
      : 'var(--rsvp-secondary-btn-border-color)'};
  color: ${({ isPrimary }) =>
    isPrimary
      ? 'var(--rsvp-primary-btn-text-color)'
      : 'var(--rsvp-secondary-btn-text-color)'};

  &:hover {
    background-color: var(--rsvp-primary-btn-color);
  }
`;

function CounterControl({
  className,
  value,
  label,
  onIncrement,
  onDecrement,
  disabled = false,
}: CounterControlProps) {
  return (
    <div className={cn('flex-1 flex items-center gap-2', className)}>
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled}
        className='h-8 w-8 shrink-0'
        style={{
          borderRadius: 'var(--rsvp-border-radius)',
          borderWidth: 'var(--rsvp-border-width)',
          borderStyle: 'solid',
          backgroundColor: 'var(--rsvp-secondary-btn-color)',
          borderColor: 'var(--rsvp-secondary-btn-border-color)',
          color: 'var(--rsvp-secondary-btn-text-color)',
        }}
        onClick={onDecrement}
      >
        <Minus className='h-4 w-4' />
      </Button>
      <div className='flex-1 text-center'>
        <span
          className='text-base font-semibold'
          style={{
            color: 'var(--rsvp-label-color)',
          }}
        >
          {value}
        </span>
        <span
          className='text-sm ml-1'
          style={{
            color: 'var(--rsvp-label-color)',
          }}
        >
          {label}
        </span>
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled}
        className='h-8 w-8 shrink-0'
        style={{
          borderRadius: 'var(--rsvp-border-radius)',
          borderWidth: 'var(--rsvp-border-width)',
          borderStyle: 'solid',
          backgroundColor: 'var(--rsvp-secondary-btn-color)',
          borderColor: 'var(--rsvp-secondary-btn-border-color)',
          color: 'var(--rsvp-secondary-btn-text-color)',
        }}
        onClick={onIncrement}
      >
        <Plus className='h-4 w-4' />
      </Button>
    </div>
  );
}

/**
 * 本地生成或获取访客客户端特征 ID（持久化在 localStorage）
 */
const VISITOR_FEATURE_ID_KEY = 'rsvp_visitor_feature_id';

function getOrCreateVisitorFeatureId(): string {
  if (typeof window === 'undefined') {
    return 'ssr';
  }
  try {
    const existing = window.localStorage.getItem(VISITOR_FEATURE_ID_KEY);
    if (existing) return existing;
    const newId = `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_FEATURE_ID_KEY, newId);
    return newId;
  } catch {
    return `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}

interface AttachmentInputProps {
  field: RSVPField;
  formField: {
    value: any;
    onChange: (value: any) => void;
  };
  disabled?: boolean;
}

function AttachmentInput({
  field,
  formField,
  disabled = false,
}: AttachmentInputProps) {
  const { worksId } = useRSVP();
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentValue: RSVPAttachmentItem[] = Array.isArray(formField.value)
    ? formField.value
    : [];

  const maxFiles = field.maxFiles ?? 3;
  const maxSizeMB = field.maxSizeMB ?? 10;
  const acceptList = field.accept ?? ['image/*', 'application/pdf'];

  const isImage = (item: RSVPAttachmentItem): boolean => {
    if (!item) return false;
    const mimeType = item.mimeType || '';
    if (mimeType.startsWith('image/')) return true;
    const url = item.url || '';
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
  };

  const formatSize = (size: number | undefined): string => {
    if (!size || size <= 0) return '';
    const mb = size / (1024 * 1024);
    if (mb >= 0.1) return `${mb.toFixed(1)}MB`;
    const kb = size / 1024;
    return `${Math.max(1, Math.round(kb))}KB`;
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const next = currentValue.filter((_, i) => i !== index);
    formField.onChange(next);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (disabled) return;
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    if (!worksId) {
      toast.error('无法获取作品信息，暂时无法上传附件');
      return;
    }

    const featureId = getOrCreateVisitorFeatureId();

    const existingCount = currentValue.length;
    if (existingCount + files.length > maxFiles) {
      toast.error(`最多只能上传 ${maxFiles} 个附件`);
      return;
    }

    setUploading(true);
    try {
      await startupStsOssClient({
        worksId,
        clientFeatureId: featureId,
      });

      const nextAttachments: RSVPAttachmentItem[] = [...currentValue];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
          toast.error(`文件「${file.name}」不能超过 ${maxSizeMB}MB`);
          continue;
        }

        const ext = getFileExtendingName(file.name);
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const fileName =
          ext && ext.length > 0
            ? `${timestamp}_${randomSuffix}.${ext}`
            : `${timestamp}_${randomSuffix}`;

        const ossKey = `rsvp-attachments/${worksId}/${fileName}`;

        try {
          const result = await uploadFileToOSS(file, ossKey);
          nextAttachments.push({
            url: result.url,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
          });
        } catch (error) {
          console.error('上传附件失败:', error);
          toast.error(`「${file.name}」上传失败，请稍后重试`);
        }
      }

      formField.onChange(nextAttachments);
    } finally {
      setUploading(false);
      // 清空 input，避免同一文件无法再次选择
      e.target.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          disabled={disabled || uploading}
          className='h-9 px-3 text-xs'
          style={{
            borderRadius: 'var(--rsvp-border-radius)',
            borderWidth: 'var(--rsvp-border-width)',
            borderStyle: 'solid',
            backgroundColor: 'var(--rsvp-secondary-btn-color)',
            borderColor: 'var(--rsvp-secondary-btn-border-color)',
            color: 'var(--rsvp-secondary-btn-text-color)',
          }}
          onClick={() => {
            if (disabled || uploading) return;
            const input = document.createElement('input');
            input.type = 'file';
            if (maxFiles > 1) {
              input.multiple = true;
            }
            if (acceptList.length > 0) {
              input.accept = acceptList.join(',');
            }
            input.onchange = ev =>
              handleFileChange(
                ev as unknown as React.ChangeEvent<HTMLInputElement>
              );
            input.click();
          }}
        >
          {uploading ? '上传中...' : '选择文件'}
        </Button>
        <span className='text-xs text-gray-500'>
          最多 {maxFiles} 个，单个不超过 {maxSizeMB}MB
        </span>
      </div>

      {currentValue.length > 0 && (
        <div className='space-y-2'>
          {currentValue.map((item, index) => {
            const image = isImage(item);
            const url = item.url ? cdnApi(item.url) : '';
            const sizeText = formatSize(item.size);

            return (
              <div
                key={`${item.url}-${index}`}
                className='flex items-center justify-between gap-2 text-xs text-gray-700'
              >
                <div className='flex items-center gap-2 min-w-0 flex-1'>
                  {image && url ? (
                    <button
                      type='button'
                      className='w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0'
                      onClick={() => {
                        if (!url) return;
                        setPreviewImage(url);
                        setPreviewOpen(true);
                      }}
                    >
                      <img
                        src={url}
                        alt={item.name || '附件图片'}
                        className='w-full h-full object-cover'
                      />
                    </button>
                  ) : null}
                  <div className='flex flex-col min-w-0'>
                    <span className='truncate max-w-full' title={item.name}>
                      {item.name || '附件'}
                    </span>
                    {sizeText ? (
                      <span className='text-[10px] text-gray-400'>
                        {sizeText}
                      </span>
                    ) : null}
                  </div>
                </div>
                {!disabled && (
                  <button
                    type='button'
                    className='text-red-500 ml-2 flex-shrink-0'
                    onClick={() => handleRemove(index)}
                  >
                    删除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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

/**
 * 独立的 RSVP 表单字段渲染组件
 * 可以复用于任何需要显示/编辑 RSVP 表单字段的场景
 */
export function RSVPFormFields({
  fields,
  control,
  className = '',
  disabled = false,
}: RSVPFormFieldsProps) {
  // 主题已通过 CSS 变量在父组件中设置，这里不再需要 theme 参数

  return (
    <div className={`space-y-3 ${className}`}>
      {fields
        .filter(field => field.enabled !== false)
        .map(field => (
          <FormField
            key={field.id}
            control={control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className='space-y-1'>
                <FormLabel
                  className='font-medium'
                  style={{
                    lineHeight: '1.5',
                    color: 'var(--rsvp-label-color)',
                    fontSize: 'var(--rsvp-control-font-size)',
                  }}
                >
                  {field.label === '访客' ? '出席人数（含本人）' : field.label}
                  {field.required ? (
                    <span className='text-red-500 ml-1'>*</span>
                  ) : null}
                </FormLabel>
                <FormControl>
                  {field.type === 'text' ? (
                    <InputWithTheme
                      placeholder={field.placeholder || '请输入' + field.label}
                      value={formField.value as string}
                      onChange={formField.onChange}
                      onBlur={formField.onBlur}
                      name={formField.name}
                      ref={formField.ref}
                      disabled={disabled}
                      className='focus:ring-0 [&::placeholder]:text-[var(--rsvp-input-placeholder-color)]'
                    />
                  ) : field.type === 'address' ? (
                    <AddressSelector
                      field={field}
                      formField={formField}
                      disabled={disabled}
                    />
                  ) : field.type === 'radio' ? (
                    <div className='flex flex-wrap items-center gap-3'>
                      {field.options?.map(opt => {
                        const isSelected = formField.value === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={disabled}
                            className='inline-flex shrink-0 items-center gap-2'
                            style={{
                              borderRadius: 'var(--rsvp-border-radius)',
                              borderWidth: 'var(--rsvp-border-width)',
                              backgroundColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-color)',
                              color: isSelected
                                ? 'var(--rsvp-primary-btn-text-color)'
                                : 'var(--rsvp-secondary-btn-text-color)',
                              borderColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-border-color)',
                              borderStyle: 'solid',
                              fontSize: 'var(--rsvp-control-font-size)',
                              paddingTop: 'var(--rsvp-control-padding)',
                              paddingBottom: 'var(--rsvp-control-padding)',
                              paddingLeft:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              paddingRight:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              lineHeight:
                                'calc(var(--rsvp-control-font-size) * 1.2)',
                            }}
                            onClick={() => formField.onChange(opt.value)}
                          >
                            <Circle
                              className={cn(
                                'shrink-0',
                                isSelected ? 'fill-current' : ''
                              )}
                              style={{
                                width:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                                height:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                              }}
                            />
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className='flex flex-wrap items-center gap-3'>
                      {field.options?.map(opt => {
                        const isSelected = (
                          (formField.value as string[]) || []
                        ).includes(opt.value);
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={disabled}
                            className='inline-flex shrink-0 items-center gap-2'
                            style={{
                              borderRadius: 'var(--rsvp-border-radius)',
                              borderWidth: 'var(--rsvp-border-width)',
                              backgroundColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-color)',
                              color: isSelected
                                ? 'var(--rsvp-primary-btn-text-color)'
                                : 'var(--rsvp-secondary-btn-text-color)',
                              borderColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-border-color)',
                              borderStyle: 'solid',
                              fontSize: 'var(--rsvp-control-font-size)',
                              paddingTop: 'var(--rsvp-control-padding)',
                              paddingBottom: 'var(--rsvp-control-padding)',
                              paddingLeft:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              paddingRight:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              lineHeight:
                                'calc(var(--rsvp-control-font-size) * 1.2)',
                            }}
                            onClick={() => {
                              const currentValue =
                                (formField.value as string[]) || [];
                              if (isSelected) {
                                formField.onChange(
                                  currentValue.filter(v => v !== opt.value)
                                );
                              } else {
                                formField.onChange([
                                  ...currentValue,
                                  opt.value,
                                ]);
                              }
                            }}
                          >
                            <CheckSquare2
                              className='shrink-0'
                              style={{
                                width:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                                height:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                              }}
                            />
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  ) : field.type === 'attachment' ? (
                    <AttachmentInput
                      field={field}
                      formField={formField}
                      disabled={disabled}
                    />
                  ) : field.type === 'guest_count' ? (
                    <div>
                      {field.splitAdultChild ? (
                        <div className='flex items-center gap-3'>
                          {/* 成人 */}
                          <CounterControl
                            value={formField.value?.adult || 1}
                            label='成人'
                            disabled={disabled}
                            onIncrement={() => {
                              const currentValue = formField.value;
                              formField.onChange({
                                ...currentValue,
                                adult: Math.max(
                                  1,
                                  (currentValue.adult || 1) + 1
                                ),
                              });
                            }}
                            onDecrement={() => {
                              const currentValue = formField.value;
                              formField.onChange({
                                ...currentValue,
                                adult: Math.max(
                                  1,
                                  (currentValue.adult || 1) - 1
                                ),
                              });
                            }}
                          />
                          {/* 儿童 */}
                          <CounterControl
                            value={formField.value?.child || 0}
                            label='儿童'
                            disabled={disabled}
                            onIncrement={() => {
                              const currentValue = formField.value;
                              formField.onChange({
                                ...currentValue,
                                child: Math.max(
                                  0,
                                  (currentValue.child || 0) + 1
                                ),
                              });
                            }}
                            onDecrement={() => {
                              const currentValue = formField.value;
                              formField.onChange({
                                ...currentValue,
                                child: Math.max(
                                  0,
                                  (currentValue.child || 0) - 1
                                ),
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <CounterControl
                          className='w-1/2'
                          value={
                            (
                              formField.value as {
                                total: number;
                              }
                            )?.total || 0
                          }
                          label='人数'
                          disabled={disabled}
                          onIncrement={() => {
                            const currentValue = (formField.value as {
                              total: number;
                            }) || { total: 0 };
                            formField.onChange({
                              ...currentValue,
                              total: (currentValue.total || 0) + 1,
                            });
                          }}
                          onDecrement={() => {
                            const currentValue = (formField.value as {
                              total: number;
                            }) || { total: 0 };
                            formField.onChange({
                              ...currentValue,
                              total: (currentValue.total || 0) - 1,
                            });
                          }}
                        />
                      )}
                    </div>
                  ) : null}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
    </div>
  );
}
