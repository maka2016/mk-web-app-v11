'use client';
import { BtnLite } from '@/components/GridV3/shared/style-comps';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import cls from 'classnames';
import {
  ArrowLeft,
  CheckSquare2,
  ChevronDown,
  ChevronUp,
  Circle,
  GripVertical,
  Lightbulb,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVP } from '../RSVPContext';
import { FieldType, RSVPAttrs, RSVPField, RSVPFieldOption } from '../type';

interface BaseProps {
  attrs: RSVPAttrs;
  editorSDK?: EditorSDK;
  layer: LayerElemItem;
}

export default function RSVPConfigPanelTrigger({
  attrs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editorSDK,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layer,
}: BaseProps) {
  return (
    <>
      <BtnLite
        title='RSVP配置'
        onClick={() => {
          const trigger = document.getElementById(
            `hidden_trigger_for_rsvp_config_panel_${attrs.formConfigId}`
          );
          if (trigger) {
            trigger.click();
          }
        }}
      >
        <Icon name='form-fill' size={20} />
        <span>RSVP配置</span>
      </BtnLite>
    </>
  );
}

const fieldTypes = [
  { label: '文本', value: 'text' as FieldType, icon: Pencil },
  { label: '单选', value: 'radio' as FieldType, icon: Circle },
  { label: '多选', value: 'checkbox' as FieldType, icon: CheckSquare2 },
  { label: '访客人数', value: 'guest_count' as FieldType },
];

export function RSVPConfigPanel({ onClose }: { onClose?: () => void }) {
  const rsvp = useRSVP();
  const router = useRouter();
  const {
    config,
    title,
    fields,
    error,
    setTitle,
    setConfig,
    setFields,
    handleSave,
  } = rsvp;

  const [saving, setSaving] = useState<boolean>(false);
  const [showFieldEditor, setShowFieldEditor] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<RSVPField | null>(null);
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] =
    useState<boolean>(false);
  const [collectForm, setCollectForm] = useState<boolean>(
    config?.collect_form ?? fields.length > 0
  );

  // 同步 collectForm 状态与 config.collect_form
  useEffect(() => {
    if (config?.collect_form !== undefined) {
      setCollectForm(config.collect_form);
    } else if (fields.length > 0) {
      setCollectForm(true);
    }
  }, [config?.collect_form, fields.length]);

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

  // 系统字段不允许删除，保留此函数以备将来使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // 保存 collect_form 到 config
      setConfig({
        ...config,
        collect_form: collectForm,
      });
      await handleSave();
    } catch {
      // 错误已在 Context 中处理
    } finally {
      setSaving(false);
      onClose?.();
    }
  };

  return (
    <div className='relative flex flex-col h-full max-h-screen overflow-hidden'>
      {/* 顶部导航栏 - 移动端风格 */}
      <div className='px-4 py-3 border-b border-black/[0.06] flex items-center justify-between bg-white flex-shrink-0 z-10'>
        <div className='flex items-center gap-2 flex-1'>
          <button
            onClick={() => {
              onClose?.();
            }}
            className='flex items-center gap-1 text-[#09090B]'
          >
            <ArrowLeft size={20} />
            <span className='text-sm'>返回</span>
          </button>
          <span className='font-semibold text-lg leading-[26px] text-[#09090B] ml-4'>
            RSVP配置
          </span>
        </div>
        <Button
          onClick={handleSaveClick}
          disabled={saving}
          size='sm'
          className='bg-[#09090B] text-white hover:bg-[#09090B]/90 h-8 px-4'
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='px-4 py-4 flex flex-col gap-4'>
          {error ? <div className='text-red-500 text-sm'>{error}</div> : null}

          {/* Enable RSVP */}
          <div className='border border-black/[0.1] rounded-xl p-4'>
            <div className='flex items-start justify-between mb-2'>
              <div className='flex-1'>
                <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                  启用RSVP
                </div>
                <div className='text-sm leading-5 text-black/60'>
                  允许访客在线回复是否参加
                </div>
              </div>
              <Switch
                checked={config.enabled ?? true}
                onCheckedChange={checked =>
                  setConfig({ ...config, enabled: checked })
                }
                className='ml-4'
              />
            </div>
          </div>

          {/* Collect form information */}
          <div className='border border-black/[0.1] rounded-xl p-4'>
            <div className='flex items-start justify-between mb-4'>
              <div className='flex-1'>
                <div className='font-semibold text-base leading-6 text-[#09090B] mb-1'>
                  收集表单信息
                </div>
                <div className='text-sm leading-5 text-black/60'>
                  向访客收集联系方式和相关信息
                </div>
              </div>
              <Switch
                checked={collectForm}
                onCheckedChange={setCollectForm}
                className='ml-4'
              />
            </div>

            {/* 当收集表单开关打开时，显示字段列表 */}
            {collectForm && (
              <>
                <div className='flex items-center justify-between mb-3'>
                  <div className='font-semibold text-base leading-6 text-[#09090B]'>
                    表单字段
                  </div>
                  <button
                    onClick={addField}
                    className='text-[#3358D4] text-sm font-semibold hover:underline'
                  >
                    + 添加自定义
                  </button>
                </div>

                {/* 提示框 */}
                <div className='bg-[#E6F0FF] border border-[#B3D9FF] rounded-lg p-3 mb-3 flex items-start gap-2'>
                  <Lightbulb
                    size={16}
                    className='text-[#3358D4] mt-0.5 flex-shrink-0'
                  />
                  <div className='text-xs leading-5 text-[#09090B]'>
                    按住并拖拽字段以调整顺序。字段顺序会影响访客填写表单时看到的顺序
                  </div>
                </div>

                {/* 字段列表 */}
                <div className='flex flex-col gap-2'>
                  {fields.map((f: RSVPField, index: number) => (
                    <FieldItem
                      key={f.id}
                      field={f}
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
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 基础信息 - 默认折叠 */}
          <div className='border border-black/[0.1] rounded-xl'>
            <div
              className='p-3 flex items-center justify-between cursor-pointer'
              onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
            >
              <div className='font-semibold text-base leading-6 text-[#09090B]'>
                基础信息
              </div>
              {isBasicInfoExpanded ? (
                <ChevronUp className='h-4 w-4 text-gray-500' />
              ) : (
                <ChevronDown className='h-4 w-4 text-gray-500' />
              )}
            </div>
            {isBasicInfoExpanded && (
              <div className='px-3 pb-3 space-y-3'>
                <div>
                  <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                    标题
                  </div>
                  <Input
                    className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder='如：我要报名'
                  />
                </div>
                <div>
                  <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                    描述
                  </div>
                  <textarea
                    className='h-[72px] resize-none w-full border-none text-xs rounded-md px-3 py-2 outline-none bg-[#F3F3F5]'
                    value={config.desc ?? ''}
                    onChange={e =>
                      setConfig({
                        ...config,
                        desc: e.target.value || null,
                      })
                    }
                    placeholder='补充说明（可选）'
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FieldEditorDialog
        key={editingField?.id || 'new'}
        field={editingField}
        open={showFieldEditor}
        onOpenChange={setShowFieldEditor}
        onSave={(field: RSVPField) => {
          if (field.id && fields.find((f: RSVPField) => f.id === field.id)) {
            // 更新现有字段时，保留 isSystem 属性
            updateField(field.id, field);
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
    </div>
  );
}

interface FieldItemProps {
  field: RSVPField;
  index: number;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onToggleSplitAdultChild: (id: string, split: boolean) => void;
  onToggleRequired: (id: string, required: boolean) => void;
}

function FieldItem({
  field,
  onToggleEnabled,
  onToggleSplitAdultChild,
  onToggleRequired,
}: FieldItemProps) {
  // 获取字段显示名称
  const getFieldDisplayLabel = (field: RSVPField) => {
    if (field.type === 'guest_count') return '访客';
    if (field.id === 'phone') return '手机';
    if (field.id === 'email') return '邮箱';
    if (field.id === 'remark') return '备注';
    return field.label;
  };

  return (
    <div className='border border-[#e4e4e7] rounded-md bg-white'>
      <div className='p-3 flex items-center gap-3'>
        {/* 拖拽手柄 */}
        <div className='cursor-grab active:cursor-grabbing text-gray-400'>
          <GripVertical size={20} />
        </div>

        {/* 开关 */}
        <Switch
          checked={field.enabled !== false}
          onCheckedChange={checked => onToggleEnabled(field.id, checked)}
        />

        {/* 字段名称 */}
        <div className='flex-1'>
          <div className='font-semibold text-sm leading-5 text-[#09090B]'>
            {getFieldDisplayLabel(field)}
          </div>
        </div>

        {/* Required/Optional 标签 - 可点击切换 */}
        <div className='flex items-center gap-2'>
          <button
            onClick={() => onToggleRequired(field.id, !field.required)}
            className={
              field.required
                ? 'px-2 py-0.5 bg-[#09090B] text-white text-xs font-semibold rounded cursor-pointer hover:bg-[#09090B]/90 transition-colors'
                : 'px-2 py-0.5 bg-[#F4F4F5] text-[#09090B] text-xs font-semibold rounded cursor-pointer hover:bg-[#E4E4E7] transition-colors'
            }
          >
            {field.required ? '必填' : '选填'}
          </button>
        </div>
      </div>

      {/* Guests字段的子选项 */}
      {field.type === 'guest_count' && field.enabled !== false && (
        <div className='px-3 pb-3 pl-14'>
          <div className='flex items-center gap-2'>
            <Switch
              checked={field.splitAdultChild ?? false}
              onCheckedChange={checked =>
                onToggleSplitAdultChild(field.id, checked)
              }
            />
            <span className='text-sm leading-5 text-[#09090B]'>
              分别统计大人和小孩
            </span>
          </div>
        </div>
      )}

      {/* 自定义字段的选项预览 */}
      {field.options && ['radio', 'checkbox'].includes(field.type) && (
        <div className='px-3 pb-3 pl-14'>
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
  const getInitialField = (): RSVPField => {
    return (
      field || {
        id: '',
        type: 'text',
        label: '',
        required: false,
        placeholder: '',
        enabled: true,
      }
    );
  };

  const [localField, setLocalField] = useState<RSVPField>(getInitialField());
  // 独立的选项文本输入状态，不立即解析
  const [optionsInputText, setOptionsInputText] = useState<string>(() => {
    return field?.options?.map(o => o.label).join(', ') || '';
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
        enabled: true,
      };
      // 使用 setTimeout 避免在 effect 中同步调用 setState
      setTimeout(() => {
        setLocalField(initialField);
        setOptionsInputText(field?.options?.map(o => o.label).join(', ') || '');
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
      if (!optionsInputText.trim()) {
        toast.error('请输入选项内容');
        return;
      }
      const parsedOptions = parseOptions(optionsInputText);
      if (parsedOptions.length === 0) {
        toast.error('请至少输入一个选项');
        return;
      }
      onSave({ ...localField, options: parsedOptions });
    } else {
      onSave(localField);
    }
  };

  // 解析选项文本为选项数组（仅用于预览）
  const parseOptions = (text: string): RSVPFieldOption[] => {
    if (!text.trim()) return [];
    return text
      .split(/[,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((label, idx) => ({ label, value: String(idx + 1) }));
  };

  // 实时解析选项用于预览
  const previewOptions = parseOptions(optionsInputText);

  return (
    <ResponsiveDialog isOpen={open} onOpenChange={onOpenChange}>
      <div>
        <div className='font-semibold text-lg leading-6 text-[#09090b] px-4 py-4'>
          {localField.id ? '修改自定义字段' : '添加自定义字段'}
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
                      'relative flex-1 border rounded-lg bg-white cursor-pointer transition-all',
                      isSelected
                        ? 'border-[#09090B] shadow-sm'
                        : 'border-[#E4E4E7] hover:border-[#09090B]/50'
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
                      // 如果切换到单选或多选，且没有选项文本，设置默认值
                      if (
                        (newType === 'radio' || newType === 'checkbox') &&
                        !optionsInputText.trim()
                      ) {
                        setOptionsInputText('选项一, 选项二');
                      } else if (newType === 'text') {
                        // 切换到文本类型时，清空选项文本
                        setOptionsInputText('');
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
          {['radio', 'checkbox'].includes(localField.type) && (
            <div className='mt-3'>
              <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
                选项内容 <span className='text-red-500'>*</span>
              </div>
              <Input
                value={optionsInputText}
                onChange={e => {
                  // 只更新输入文本，不做任何限制
                  setOptionsInputText(e.target.value);
                }}
                placeholder='e.g., red, blue, green'
                className='w-full bg-white border border-black/[0.06] rounded-md px-3 py-2 text-sm mb-2'
              />
              <div className='flex items-start gap-1.5 text-xs text-black/60 mb-2'>
                <Lightbulb size={14} className='mt-0.5 flex-shrink-0' />
                <span>提示：多个选项请使用逗号（,）或空格分隔</span>
              </div>
              {/* 选项预览标签 */}
              {previewOptions.length > 0 && (
                <div className='flex items-center gap-1.5 flex-wrap'>
                  {previewOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className='border border-[#e4e4e7] bg-[#f4f4f5] rounded px-2 py-0.5 text-xs font-semibold leading-[18px] text-[#09090b]'
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='w-full p-4 flex items-center gap-3 border-t border-[#e4e4e7]'>
          <Button
            size='lg'
            variant='outline'
            className='flex-1 bg-white hover:bg-gray-50 border border-black/[0.06] text-[#09090B]'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size='lg'
            className='flex-1 bg-[#09090B] text-white hover:bg-[#09090B]/90'
            onClick={handleSave}
          >
            {localField.id ? '保存' : '添加字段'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
