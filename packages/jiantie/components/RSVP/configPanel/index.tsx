'use client';
import { BtnLite } from '@/components/GridEditorV3/components/style-comps';
import { showSelector } from '@/components/showSelector';
import { Button } from '@workspace/ui/components/button';
import { Form } from '@workspace/ui/components/form';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import cls from 'classnames';
import {
  CalendarCheck,
  CheckSquare2,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Settings,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ButtonWithTheme, RSVPFormFields } from '../comp/RSVPFormFields';
import { useRSVP } from '../RSVPContext';
import {
  DEFAULT_RSVP_THEME,
  FieldType,
  RSVPField,
  RSVPFieldOption,
  RsvpFormConfigEntityForUi,
} from '../type';

export default function RSVPConfigPanelTrigger() {
  // 使用formConfigId或默认值作为trigger ID
  return (
    <>
      <BtnLite
        title='回执设置'
        onClick={() => {
          const trigger = document.getElementById(
            `hidden_trigger_for_rsvp_config_panel`
          );
          console.log('trigger', trigger);
          if (trigger) {
            trigger.click();
          }
        }}
      >
        <Icon name='form-fill' size={20} />
        <span>回执表单</span>
      </BtnLite>
    </>
  );
}

const fieldTypes = [
  { label: '文本', value: 'text' as FieldType, icon: Pencil },
  { label: '单选', value: 'radio' as FieldType, icon: Circle },
  { label: '多选', value: 'checkbox' as FieldType, icon: CheckSquare2 },
  { label: '出席人数', value: 'guest_count' as FieldType },
];

export function RSVPConfigPanel({
  onClose,
  onEnableChange,
}: {
  onClose?: () => void;
  onEnableChange?: (nextConfig: RsvpFormConfigEntityForUi) => void;
}) {
  const rsvp = useRSVP();
  const { config, fields, error, setConfig, setFields, handleSave } = rsvp;

  const [saving, setSaving] = useState<boolean>(false);
  const [showFieldEditor, setShowFieldEditor] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<RSVPField | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState<boolean>(false);
  const [showInactiveFields, setShowInactiveFields] = useState<boolean>(false);

  // 预览表单使用的表单实例
  const previewForm = useForm();

  if (!config) {
    return (
      <div className='w-full py-4 text-center text-sm text-gray-500'>
        配置加载中...
      </div>
    );
  }

  const addField = () => {
    setEditingField({
      id: '',
      type: 'text',
      label: '未命名字段',
      required: false,
      placeholder: '',
    });
    setShowFieldEditor(true);
  };

  // 删除字段（仅非系统字段）
  const removeField = (id: string) => {
    // 系统字段不允许删除
    const field = fields.find(f => f.id === id);
    if (field?.isSystem) {
      return;
    }
    setFields(fields.filter((f: RSVPField) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<RSVPField>) => {
    setFields(
      fields.map((f: RSVPField) => {
        if (f.id === id) {
          // 系统字段的 isSystem 属性不能被修改
          const updated = { ...f, ...patch };
          if (f.isSystem) {
            updated.isSystem = true;
          }
          return updated;
        }
        return f;
      })
    );
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      // collect_form 已在开关切换时同步到 config，直接保存即可
      await handleSave();
      toast.success('设置已保存');
      onClose?.();
    } catch (e: any) {
      // 错误已在 Context 中处理
      toast.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='relative flex flex-col h-full max-h-screen overflow-hidden bg-gray-100'>
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='header sticky top-0 z-10 border-b border-black/[0.1] bg-white px-4 py-3'>
          <div className='flex items-center justify-between'>
            <Button variant='outline' size='sm' onClick={onClose}>
              取消
            </Button>
            <div className='font-semibold text-base text-[#09090B]'>
              表单设置
            </div>
            <Button size='sm' onClick={handleSaveClick} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        <div className='px-4 py-4 flex flex-col gap-4'>
          {error ? <div className='text-red-500 text-sm'>{error}</div> : null}

          {/* Enable RSVP */}
          <div className='border border-gray-200 rounded-lg shadow-sm p-3 bg-white'>
            <div className='flex items-start justify-between mb-2'>
              <div className='flex-1'>
                <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                  启用回执
                </div>
                <div className='text-sm leading-5 text-black/60'>
                  允许访客在线回复是否出席
                </div>
              </div>
              <Switch
                checked={!!config.enabled}
                onCheckedChange={checked => {
                  // 当启用状态改变时，自动同步 collect_form
                  const nextConfig = {
                    ...config,
                    enabled: checked,
                    collect_form: checked, // collect_form 跟随 enabled
                  };
                  setConfig(nextConfig);
                  onEnableChange?.(nextConfig);
                }}
                className='ml-4'
              />
            </div>
          </div>

          {/* Collect form information */}
          <div className={cn('py-4', config.enabled ? '' : 'hidden')}>
            {/* 当收集表单开关打开时，显示字段列表 */}
            <div className='flex items-center justify-between mb-3'>
              <div className='font-semibold text-base leading-6 text-[#09090B]'>
                表单字段
              </div>
              <button
                onClick={addField}
                className='text-[#3358D4] text-sm font-semibold'
              >
                + 添加自定义
              </button>
            </div>

            {/* 已激活字段列表 */}
            <div className='mb-2'>
              <div className='flex flex-col gap-2'>
                {fields
                  .map((f: RSVPField, index: number) => ({ field: f, index }))
                  .filter(({ field }) => field.enabled)
                  .map(({ field, index }) => (
                    <FieldItem
                      key={field.id}
                      field={field}
                      index={index}
                      onToggleEnabled={(id, enabled) => {
                        updateField(id, { enabled });
                      }}
                      onToggleSplitAdultChild={(id, split) => {
                        updateField(id, { splitAdultChild: split });
                      }}
                      onToggleRequired={(id, required) => {
                        updateField(id, { required });
                      }}
                      onUpdateLabel={(id, label) => {
                        updateField(id, { label });
                      }}
                      onRemove={id => {
                        removeField(id);
                      }}
                      onEdit={field => {
                        setEditingField(field);
                        setShowFieldEditor(true);
                      }}
                    />
                  ))}
                {fields.filter(f => f.enabled).length === 0 && (
                  <div className='text-sm text-gray-400 py-4 text-center'>
                    暂无已激活字段
                  </div>
                )}
              </div>
            </div>

            {/* 未激活字段列表 */}
            {fields.filter(f => !f.enabled).length > 0 && (
              <div>
                <Button
                  variant={'ghost'}
                  onClick={() => setShowInactiveFields(!showInactiveFields)}
                  className='flex items-center justify-center w-full mb-2 text-blue-500'
                >
                  <span>添加更多字段</span>
                  {showInactiveFields ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </Button>
                {showInactiveFields && (
                  <div className='flex flex-col gap-2'>
                    {fields
                      .map((f: RSVPField, index: number) => ({
                        field: f,
                        index,
                      }))
                      .filter(({ field }) => !field.enabled)
                      .map(({ field, index }) => (
                        <FieldItem
                          key={field.id}
                          field={field}
                          index={index}
                          onToggleEnabled={(id, enabled) => {
                            updateField(id, { enabled });
                          }}
                          onToggleSplitAdultChild={(id, split) => {
                            updateField(id, { splitAdultChild: split });
                          }}
                          onToggleRequired={(id, required) => {
                            updateField(id, { required });
                          }}
                          onUpdateLabel={(id, label) => {
                            updateField(id, { label });
                          }}
                          onRemove={id => {
                            removeField(id);
                          }}
                          onEdit={field => {
                            setEditingField(field);
                            setShowFieldEditor(true);
                          }}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      {config.enabled && (
        <div className='border-t border-black/[0.1] px-4 py-4 bg-white'>
          <div className='flex items-center gap-3'>
            <>
              <Button
                onClick={() => setShowPreviewDialog(true)}
                variant={'outline'}
                className='flex items-center gap-2 flex-1'
              >
                <Eye size={16} />
                预览表单
              </Button>
              <Button
                onClick={() => setShowFeedbackDialog(true)}
                variant={'outline'}
                className='flex items-center gap-2 flex-1'
              >
                <Settings size={16} />
                提交后反馈
              </Button>
            </>
          </div>
        </div>
      )}

      <FieldEditorDialog
        key={editingField?.id || 'new'}
        field={editingField}
        open={showFieldEditor}
        onOpenChange={setShowFieldEditor}
        onSave={(field: RSVPField) => {
          if (field.id && fields.find((f: RSVPField) => f.id === field.id)) {
            // 更新现有字段时，保留 isSystem 属性
            // 系统字段的类型不允许修改，确保类型不变
            const originalField = fields.find(
              (f: RSVPField) => f.id === field.id
            );
            if (originalField?.isSystem) {
              // 系统字段：保留原始类型，只更新其他属性
              updateField(field.id, {
                ...field,
                type: originalField.type, // 强制保留原始类型
              });
            } else {
              // 自定义字段：可以更新所有属性
              updateField(field.id, field);
            }
          } else {
            // 添加新字段时，确保 isSystem 为 false（用户添加的字段不是系统字段）
            setFields([
              ...fields,
              { ...field, id: `field_${Date.now()}`, isSystem: false },
            ]);
          }
          setShowFieldEditor(false);
        }}
      />

      {/* 预览表单弹窗 */}
      {config.enabled && (
        <ResponsiveDialog
          isOpen={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          title='预览表单'
        >
          <div
            className='relative flex flex-col h-full max-h-[80vh] overflow-auto'
            style={
              {
                '--rsvp-bg-color': DEFAULT_RSVP_THEME.backgroundColor,
                '--rsvp-border-radius': `${DEFAULT_RSVP_THEME.borderRadius}px`,
                '--rsvp-border-color': DEFAULT_RSVP_THEME.borderColor,
                '--rsvp-border-width': `${DEFAULT_RSVP_THEME.borderWidth}px`,
                '--rsvp-box-shadow': DEFAULT_RSVP_THEME.boxShadow,
                '--rsvp-backdrop-filter':
                  DEFAULT_RSVP_THEME.backdropFilter || 'none',
                '--rsvp-control-font-size': `${DEFAULT_RSVP_THEME.controlFontSize}px`,
                '--rsvp-control-padding': `${DEFAULT_RSVP_THEME.controlPadding}px`,
                '--rsvp-header-padding': `${DEFAULT_RSVP_THEME.headerPadding}`,
                '--rsvp-content-padding': `${DEFAULT_RSVP_THEME.contentPadding}`,
                '--rsvp-primary-btn-color':
                  DEFAULT_RSVP_THEME.primaryButtonColor,
                '--rsvp-primary-btn-text-color':
                  DEFAULT_RSVP_THEME.primaryButtonTextColor,
                '--rsvp-secondary-btn-color':
                  DEFAULT_RSVP_THEME.secondaryButtonColor,
                '--rsvp-secondary-btn-text-color':
                  DEFAULT_RSVP_THEME.secondaryButtonTextColor,
                '--rsvp-secondary-btn-border-color':
                  DEFAULT_RSVP_THEME.secondaryButtonBorderColor,
                '--rsvp-input-bg-color':
                  DEFAULT_RSVP_THEME.inputBackgroundColor,
                '--rsvp-input-border-color':
                  DEFAULT_RSVP_THEME.inputBorderColor,
                '--rsvp-input-text-color': DEFAULT_RSVP_THEME.inputTextColor,
                '--rsvp-input-placeholder-color':
                  DEFAULT_RSVP_THEME.inputPlaceholderColor ||
                  DEFAULT_RSVP_THEME.secondaryButtonTextColor,
                '--rsvp-text-color': DEFAULT_RSVP_THEME.textColor,
                '--rsvp-label-color': DEFAULT_RSVP_THEME.labelColor,
              } as React.CSSProperties
            }
          >
            <div className='flex-1 overflow-y-auto min-h-0 px-4 py-4'>
              <Form {...previewForm}>
                <form>
                  <RSVPFormFields
                    fields={fields}
                    control={previewForm.control}
                    disabled={false}
                  />
                </form>
              </Form>
            </div>
            {/* 提交按钮 */}
            <div className='pt-3 px-4 pb-4 border-t border-black/[0.1] bg-white'>
              <ButtonWithTheme
                isPrimary
                onClick={() => {
                  toast('请分享后操作', {
                    icon: 'ℹ️',
                  });
                }}
                className='w-full'
              >
                提交
              </ButtonWithTheme>
            </div>
          </div>
        </ResponsiveDialog>
      )}

      {/* 提交成功反馈设置弹窗 */}
      {config.enabled && (
        <ResponsiveDialog
          isOpen={showFeedbackDialog}
          onOpenChange={setShowFeedbackDialog}
          title='提交成功反馈'
        >
          <div className='relative flex flex-col h-full max-h-screen overflow-hidden pb-24'>
            <div className='flex-1 overflow-y-auto min-h-0'>
              <div className='px-4 py-4 flex flex-col gap-4'>
                <div className='text-sm leading-5 text-black/60 mb-4'>
                  设置观众提交表单成功后显示的提示内容
                </div>

                {/* 感谢语 */}
                <div className='mb-4'>
                  <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
                    感谢语
                  </div>
                  <Input
                    value={
                      config.success_feedback_config?.success_message || ''
                    }
                    onChange={e => {
                      setConfig({
                        ...config,
                        success_feedback_config: {
                          ...(config.success_feedback_config || {}),
                          success_message: e.target.value || null,
                        },
                      });
                    }}
                    placeholder='例如：感谢您的回复，期待您的到来'
                    className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
                  />
                </div>

                {/* 上传图片 */}
                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <div className='font-semibold text-sm leading-5 text-[#09090b]'>
                      二维码/群名片/其他图片
                    </div>
                    <Switch
                      checked={
                        config.success_feedback_config?.enable_image !== false
                      }
                      onCheckedChange={checked => {
                        setConfig({
                          ...config,
                          success_feedback_config: {
                            ...(config.success_feedback_config || {}),
                            enable_image: checked,
                            success_image: checked
                              ? config.success_feedback_config?.success_image ||
                                null
                              : null, // 关闭时清空图片
                          },
                        });
                      }}
                    />
                  </div>
                  {config.success_feedback_config?.enable_image !== false && (
                    <div className='relative mt-3'>
                      {config.success_feedback_config?.success_image ? (
                        <div className='relative inline-block'>
                          <img
                            src={config.success_feedback_config.success_image}
                            alt='成功提示图片'
                            className='max-w-full h-auto rounded-md border border-[#e4e4e7]'
                            style={{ maxHeight: '200px' }}
                          />
                          <button
                            onClick={() => {
                              setConfig({
                                ...config,
                                success_feedback_config: {
                                  ...(config.success_feedback_config || {}),
                                  success_image: null,
                                },
                              });
                            }}
                            className='absolute -top-2 -right-2 p-1 bg-white rounded-full border border-[#e4e4e7] shadow-sm'
                            title='删除图片'
                          >
                            <X size={16} className='text-gray-600' />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            showSelector({
                              type: 'picture',
                              onSelected: (params: any) => {
                                if (params.url) {
                                  setConfig({
                                    ...config,
                                    success_feedback_config: {
                                      ...(config.success_feedback_config || {}),
                                      success_image: params.url,
                                    },
                                  });
                                  toast.success('图片上传成功');
                                }
                              },
                            });
                          }}
                          className='w-full border-2 border-dashed border-[#e4e4e7] rounded-md p-8 text-center cursor-pointer hover:border-[#3358D4] transition-colors'
                        >
                          <div className='flex flex-col items-center gap-2'>
                            <Icon name='image-add' size={32} />
                            <span className='text-sm text-gray-600'>
                              点击上传图片
                            </span>
                            <span className='text-xs text-gray-400'>
                              支持 JPG、PNG、GIF、WebP
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </div>
  );
}

interface FieldItemProps {
  field: RSVPField;
  index: number;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onToggleSplitAdultChild: (id: string, split: boolean) => void;
  onToggleRequired: (id: string, required: boolean) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onEdit: (field: RSVPField) => void;
}

function FieldItem({
  field,
  onToggleEnabled,
  onToggleSplitAdultChild,
  onToggleRequired,
  onUpdateLabel,
  onRemove,
  onEdit,
}: FieldItemProps) {
  // 获取字段显示名称
  const getFieldDisplayLabel = (field: RSVPField) => {
    // 如果 field.label 存在且不为空，优先使用 field.label（允许用户自定义）
    if (field.label && field.label.trim()) {
      return field.label;
    }
    // 否则使用默认显示名称
    if (field.type === 'guest_count') return '出席人数（含本人）';
    if (field.id === 'ask_will_attend') return '询问是否出席';
    if (field.id === 'name') return '姓名';
    if (field.id === 'phone') return '手机';
    if (field.id === 'email') return '邮箱';
    if (field.id === 'remark') return '备注';
    return field.label || '未命名字段';
  };

  // 渲染系统字段的图标
  const renderFieldIcon = () => {
    if (!field.isSystem) return null;

    const iconProps = {
      size: 18,
      className: 'text-gray-500 flex-shrink-0',
    };

    switch (field.id) {
      case 'name':
        return <User {...iconProps} />;
      case 'phone':
        return <Phone {...iconProps} />;
      case 'email':
        return <Mail {...iconProps} />;
      case 'remark':
        return <MessageSquare {...iconProps} />;
      case 'ask_will_attend':
        return <CalendarCheck {...iconProps} />;
      case 'guest_count':
        return <Users {...iconProps} />;
      case 'address':
        return <MapPin {...iconProps} />;
      case 'attachment':
        return <Paperclip {...iconProps} />;
      default:
        return null;
    }
  };

  // 处理字段项点击（打开设置弹窗）
  const handleFieldClick = (e: React.MouseEvent) => {
    // 检查点击是否来自操作按钮区域，如果是则不触发编辑
    const target = e.target as HTMLElement;
    const isActionButton =
      target.closest('button') ||
      target.closest('[role="switch"]') ||
      target.closest('[data-action-button]');

    if (isActionButton) {
      return;
    }

    e.stopPropagation();
    onEdit(field);
  };

  return (
    <div
      className='border border-[#e4e4e7] rounded-lg shadow-sm p-2 bg-white relative cursor-pointer'
      onClick={handleFieldClick}
    >
      <div className='px-3 py-2 flex items-center gap-3'>
        {/* 拖拽手柄 */}
        {/* <div
          data-drag-handle
          className='cursor-grab active:cursor-grabbing text-gray-400 touch-none flex-shrink-0 select-none'
        >
          <GripVertical size={20} />
        </div> */}
        {/* 字段名称 */}
        <div className='flex-1 flex items-center gap-2'>
          {renderFieldIcon()}
          <div className='font-semibold text-sm leading-5 text-[#09090B] flex items-center gap-1'>
            {getFieldDisplayLabel(field)}
            {field.required && <span className='text-red-500'>*</span>}
          </div>
        </div>
        {/* Required/Optional 标签 - 可点击切换 */}
        {field.enabled && (
          <div className='flex items-center gap-2' data-action-button>
            {/* 删除按钮 - 仅非系统字段显示 */}
            {!field.isSystem && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemove(field.id);
                }}
                className='p-1.5 text-gray-400 flex-shrink-0'
                title='删除字段'
              >
                <Trash2 size={16} />
              </button>
            )}
            {/* <div
              className='flex items-center gap-2'
              onClick={e => e.stopPropagation()}
            >
              <span className='text-xs text-[#09090B]'>必填</span>
              <Switch
                checked={!!field.required}
                onCheckedChange={checked => onToggleRequired(field.id, checked)}
              />
            </div> */}
          </div>
        )}
        {/* 开关 */}
        <div
          className='flex items-center gap-2'
          onClick={e => e.stopPropagation()}
        >
          {/* <span className='text-xs text-[#09090B]'>显示</span> */}
          <Switch
            checked={!!field.enabled}
            onClick={e => e.stopPropagation()}
            onCheckedChange={checked => onToggleEnabled(field.id, checked)}
          />
        </div>
      </div>

      {/* Guests字段的子选项 */}
      {field.type === 'guest_count' && !!field.enabled && (
        <div
          className='px-3 pb-3 pl-12'
          data-action-button
          onClick={e => e.stopPropagation()}
        >
          <div className='flex items-center gap-2 justify-between'>
            <span className='text-xs leading-5 text-[#09090B]'>
              分别统计大人和小孩
            </span>
            <Switch
              checked={field.splitAdultChild ?? false}
              onCheckedChange={checked =>
                onToggleSplitAdultChild(field.id, checked)
              }
            />
          </div>
        </div>
      )}

      {/* 自定义字段的选项预览 */}
      {field.options && ['radio', 'checkbox'].includes(field.type) && (
        <div className='px-3 pb-3 pl-12'>
          <div className='flex items-center gap-1 flex-wrap'>
            {field.options.map((opt, idx) => (
              <div
                key={idx}
                className='border border-[#e4e4e7] bg-[#f4f4f5] rounded px-2 py-0.5 text-xs font-semibold leading-[18px] text-[#09090b]'
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldEditorDialogProps {
  field: RSVPField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: RSVPField) => void;
}

function FieldEditorDialog({
  field,
  open,
  onOpenChange,
  onSave,
}: FieldEditorDialogProps) {
  // 判断是否为系统字段
  // 系统字段是固定的，不允许修改类型
  const isSystemField = field?.isSystem ?? false;

  const getInitialField = (): RSVPField => {
    return (
      field || {
        id: '',
        type: 'text',
        label: '',
        required: false,
        placeholder: '',
        enabled: false,
      }
    );
  };

  const [localField, setLocalField] = useState<RSVPField>(getInitialField());
  // 选项列表状态，直接管理选项数组
  const [optionsList, setOptionsList] = useState<RSVPFieldOption[]>(() => {
    return field?.options || [];
  });

  // 当 field 或 open 变化时，重置本地状态
  useEffect(() => {
    if (open) {
      const initialField = field || {
        id: '',
        type: 'text',
        label: '',
        required: false,
        placeholder: '',
        enabled: false,
      };
      // 使用 setTimeout 避免在 effect 中同步调用 setState
      setTimeout(() => {
        setLocalField(initialField);
        setOptionsList(field?.options || []);
      }, 0);
    }
  }, [field, open]);

  const updateLocalField = (patch: Partial<RSVPField>) => {
    setLocalField(prev => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    if (!localField.label || !localField.label.trim()) {
      toast.error('请输入字段名称');
      return;
    }

    // 如果是单选或多选类型，需要验证选项
    if (['radio', 'checkbox'].includes(localField.type)) {
      const validOptions = optionsList.filter(
        opt => opt.label && opt.label.trim()
      );
      if (validOptions.length === 0) {
        toast.error('请至少添加一个选项');
        return;
      }
      // 确保每个选项都有 value
      const optionsWithValue = validOptions.map((opt, idx) => ({
        label: opt.label.trim(),
        value: opt.value || String(idx + 1),
      }));
      onSave({ ...localField, options: optionsWithValue });
    } else if (localField.type === 'attachment') {
      // 附件类型：验证最大文件数量在 1-9 范围内
      const maxFiles = localField.maxFiles ?? 3;
      if (maxFiles < 1 || maxFiles > 9) {
        toast.error('最大文件数量必须在 1-9 范围内');
        return;
      }
      onSave(localField);
    } else {
      onSave(localField);
    }
  };

  // 添加选项
  const handleAddOption = () => {
    const newOption: RSVPFieldOption = {
      label: '',
      value: String(optionsList.length + 1),
    };
    setOptionsList([...optionsList, newOption]);
  };

  // 更新选项
  const handleUpdateOption = (index: number, label: string) => {
    const newOptions = [...optionsList];
    newOptions[index] = {
      ...newOptions[index],
      label,
    };
    setOptionsList(newOptions);
  };

  // 删除选项
  const handleDeleteOption = (index: number) => {
    if (optionsList.length <= 1) {
      toast.error('至少需要保留一个选项');
      return;
    }
    const newOptions = optionsList.filter((_, i) => i !== index);
    setOptionsList(newOptions);
  };

  // 上移选项
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...optionsList];
    const temp = newOptions[index];
    newOptions[index] = newOptions[index - 1];
    newOptions[index - 1] = temp;
    setOptionsList(newOptions);
  };

  // 下移选项
  const handleMoveDown = (index: number) => {
    if (index === optionsList.length - 1) return;
    const newOptions = [...optionsList];
    const temp = newOptions[index];
    newOptions[index] = newOptions[index + 1];
    newOptions[index + 1] = temp;
    setOptionsList(newOptions);
  };

  return (
    <ResponsiveDialog isOpen={open} onOpenChange={onOpenChange}>
      <div className='pb-12'>
        <div className='sticky top-0 z-10 border-b border-black/[0.1] bg-white px-4 py-3 rounded-t-lg mb-3'>
          <div className='flex items-center justify-between'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <div className='font-semibold text-base text-[#09090B]'>
              {localField.id
                ? isSystemField
                  ? '字段设置'
                  : '修改自定义字段'
                : '添加自定义字段'}
            </div>
            <Button size='sm' onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
            字段名称 <span className='text-red-500'>*</span>
          </div>
          <Input
            value={localField.label}
            onChange={e => updateLocalField({ label: e.target.value })}
            placeholder='e.g. Contact Info, Preferences'
            className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
          />
        </div>

        {/* 字段类型选择 - 系统字段不显示（系统字段类型固定，不允许修改） */}
        {!isSystemField && (
          <div className='px-4 mb-5'>
            <div className='font-semibold text-sm leading-5 text-[#09090b] mb-3'>
              字段类型
            </div>
            <div className='flex items-center gap-3 mb-2'>
              {fieldTypes
                .filter(type => type.value !== 'guest_count' && type.icon)
                .map(type => {
                  const IconComponent = type.icon!;
                  const isSelected = localField.type === type.value;
                  return (
                    <div
                      key={type.value}
                      className={cls(
                        'relative flex-1 border rounded-lg bg-white transition-all cursor-pointer',
                        isSelected
                          ? 'border-[#09090B] shadow-sm'
                          : 'border-[#E4E4E7]'
                      )}
                      onClick={() => {
                        const newType = type.value;
                        updateLocalField({
                          type: newType,
                          options:
                            newType === 'radio' || newType === 'checkbox'
                              ? localField.options || []
                              : undefined,
                        });
                        // 如果切换到单选或多选，且没有选项，设置默认值
                        if (
                          (newType === 'radio' || newType === 'checkbox') &&
                          optionsList.length === 0
                        ) {
                          setOptionsList([
                            { label: '选项一', value: '1' },
                            { label: '选项二', value: '2' },
                          ]);
                        } else if (newType === 'text') {
                          // 切换到文本类型时，清空选项
                          setOptionsList([]);
                        }
                      }}
                    >
                      <div className='flex flex-col items-center justify-center py-4 px-2'>
                        <IconComponent
                          size={24}
                          className={cls(
                            'mb-2',
                            type.value === 'text'
                              ? 'text-yellow-500'
                              : 'text-gray-500'
                          )}
                        />
                        <span className='text-xs font-medium text-[#09090B]'>
                          {type.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 占位符输入 - 文本类型 */}
        {localField.type === 'text' && (
          <div className='px-4 mb-5'>
            <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
              提示语
            </div>
            <Input
              value={localField.placeholder || ''}
              onChange={e => updateLocalField({ placeholder: e.target.value })}
              placeholder='请输入提示语'
              className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
            />
          </div>
        )}

        {/* 必填选项 */}
        <div className='px-4 mb-5'>
          <div className='flex items-center justify-between'>
            <div className='font-semibold text-sm leading-5 text-[#09090b]'>
              是否必填
            </div>
            <Switch
              checked={!!localField.required}
              onCheckedChange={checked =>
                updateLocalField({ required: checked })
              }
            />
          </div>
        </div>

        {/* 选项内容 - 单选/多选类型 */}
        {['radio', 'checkbox'].includes(localField.type) && (
          <div className='px-4 mb-5'>
            <div className='flex items-center justify-between mb-3'>
              <div className='font-semibold text-sm leading-5 text-[#09090b]'>
                选项内容 <span className='text-red-500'>*</span>
              </div>
              <button
                onClick={handleAddOption}
                className='flex items-center gap-1 text-[#3358D4] text-sm font-semibold'
              >
                <Plus size={16} />
                添加选项
              </button>
            </div>

            {/* 选项列表 */}
            <div className='flex flex-col gap-2'>
              {optionsList.map((option, index) => (
                <div
                  key={index}
                  className='flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-white'
                >
                  {/* 排序按钮 */}
                  <div className='flex flex-col gap-0.5'>
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={cls(
                        'p-0.5 text-gray-400',
                        index === 0
                          ? 'opacity-30 cursor-not-allowed'
                          : 'cursor-pointer'
                      )}
                      title='上移'
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === optionsList.length - 1}
                      className={cls(
                        'p-0.5 text-gray-400',
                        index === optionsList.length - 1
                          ? 'opacity-30 cursor-not-allowed'
                          : 'cursor-pointer'
                      )}
                      title='下移'
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* 选项输入框 */}
                  <Input
                    value={option.label}
                    onChange={e => handleUpdateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    className='flex-1 bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
                  />

                  {/* 删除按钮 */}
                  <button
                    onClick={() => handleDeleteOption(index)}
                    disabled={optionsList.length <= 1}
                    className={cls(
                      'p-1.5 text-gray-400 flex-shrink-0',
                      optionsList.length <= 1
                        ? 'opacity-30 cursor-not-allowed'
                        : 'cursor-pointer'
                    )}
                    title='删除选项'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {optionsList.length === 0 && (
              <div className='text-center py-4 text-sm text-gray-400'>
                暂无选项，请点击&ldquo;添加选项&rdquo;添加
              </div>
            )}
          </div>
        )}

        {/* guest_count 类型的特殊配置 */}
        {localField.type === 'guest_count' && (
          <div className='px-4 mb-5'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold text-sm leading-5 text-[#09090b]'>
                分别统计大人和小孩
              </div>
              <Switch
                checked={!!localField.splitAdultChild}
                onCheckedChange={checked =>
                  updateLocalField({ splitAdultChild: checked })
                }
              />
            </div>
          </div>
        )}

        {/* attachment 类型的特殊配置 */}
        {localField.type === 'attachment' && (
          <div className='px-4 mb-5'>
            <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
              最大文件数量
            </div>
            <Input
              type='number'
              min={1}
              max={9}
              value={localField.maxFiles ?? 3}
              onChange={e => {
                const value = parseInt(e.target.value, 10);
                // 限制范围在 1-9
                if (value >= 1 && value <= 9) {
                  updateLocalField({ maxFiles: value });
                } else if (e.target.value === '') {
                  // 允许清空，但保存时会验证
                  updateLocalField({ maxFiles: undefined });
                }
              }}
              onBlur={e => {
                // 失焦时，如果值不在范围内，设置为默认值 3
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 1 || value > 9) {
                  updateLocalField({ maxFiles: 3 });
                }
              }}
              placeholder='1-9'
              className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm'
            />
            <div className='text-xs text-black/60 mt-1.5'>
              可设置范围：1-9 张
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
