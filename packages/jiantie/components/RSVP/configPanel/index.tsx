'use client';
import { BtnLite } from '@/components/GridV3/shared/style-comps';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import cls from 'classnames';
import { useMemo, useState } from 'react';
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
  { label: '文本', value: 'text' as FieldType },
  { label: '数字', value: 'number' as FieldType },
  { label: '长文本', value: 'textarea' as FieldType },
  { label: '单选', value: 'radio' as FieldType },
  { label: '多选', value: 'checkbox' as FieldType },
];

export function RSVPConfigPanel() {
  const rsvp = useRSVP();
  const {
    config,
    configId,
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

  const ensureOptions = (f: RSVPField): RSVPField => {
    if (f.type === 'radio' || f.type === 'checkbox') {
      return {
        ...f,
        options:
          f.options && f.options.length > 0
            ? f.options
            : [
                { label: '选项A', value: 'A' },
                { label: '选项B', value: 'B' },
              ],
      };
    }
    return { ...f, options: undefined };
  };

  const previewFields = useMemo(
    () => (config ? fields.map(ensureOptions) : []),
    [fields, config]
  );

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

  const removeField = (id: string) => {
    setFields(fields.filter((f: RSVPField) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<RSVPField>) => {
    setFields(
      fields.map((f: RSVPField) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await handleSave();
    } catch {
      // 错误已在 Context 中处理
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='relative'>
      <div className='px-4 py-3 border-b border-black/[0.06]'>
        <div className='flex items-center gap-2'>
          <Icon name='form-fill' />
          <span className='font-semibold text-lg leading-[26px]'>RSVP配置</span>
        </div>
        <div className='mt-0.5 text-[13px] leading-5 text-black/60'>
          配置报名表单和提交规则
        </div>
      </div>
      <Separator />
      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto flex flex-col gap-2'>
        {error ? <div className='text-red-500 text-sm'>{error}</div> : null}

        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            基础信息
          </div>
          <div className='mb-3'>
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

        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            提交规则
          </div>
          <div className='flex items-center gap-4 my-2'>
            <div className='flex items-center gap-2 text-xs leading-[18px] text-[#09090B]'>
              <Switch
                checked={config.enabled ?? true}
                onCheckedChange={checked =>
                  setConfig({ ...config, enabled: checked })
                }
              />
              <span>开启</span>
            </div>
          </div>
          <div className='text-xs text-black/60 mt-2'>
            <div>• 允许多次提交：已开启（默认）</div>
            <div>• 需要审核：已关闭（默认）</div>
            <div>• 最大提交次数：无限（默认）</div>
            <div>• 截止时间：无限期（默认）</div>
          </div>
        </div>

        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='flex items-center justify-between mb-3'>
            <div className='font-semibold text-base leading-6 text-[#09090B]'>
              自定义字段
            </div>
            <Button
              variant='outline'
              className='text-[#3358D4] h-8 font-semibold hover:bg-transparent'
              size='sm'
              onClick={addField}
            >
              <Icon name='add-one' size={16} />
              添加字段
            </Button>
          </div>
          <div className='flex flex-col gap-2'>
            {fields.map((f: RSVPField, index: number) => (
              <FieldItem
                key={f.id}
                field={f}
                index={index}
                onEdit={() => {
                  setEditingField(f);
                  setShowFieldEditor(true);
                }}
                onDelete={() => removeField(f.id)}
              />
            ))}
          </div>
        </div>

        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            预览
          </div>
          <div>
            <div className='font-medium text-base leading-6'>{title}</div>
            {config.desc ? (
              <div className='text-[13px] leading-5 text-black/60 mt-1'>
                {config.desc}
              </div>
            ) : null}
            <div className='mt-4 space-y-3'>
              {previewFields.map((f: RSVPField) => (
                <div key={f.id} className='mb-3'>
                  <div className='font-medium text-sm leading-5 mb-2'>
                    {f.label}
                    {f.required ? (
                      <span className='text-red-500 ml-0.5'>*</span>
                    ) : (
                      ''
                    )}
                  </div>
                  {f.type === 'textarea' ? (
                    <textarea
                      className='w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm bg-white min-h-[80px] resize-none'
                      placeholder={f.placeholder}
                      readOnly
                    />
                  ) : f.type === 'number' ? (
                    <input
                      className='w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm bg-white'
                      type='number'
                      placeholder={f.placeholder}
                      readOnly
                    />
                  ) : f.type === 'radio' ? (
                    <div className='space-y-1'>
                      {f.options?.map((opt: RSVPFieldOption) => (
                        <label
                          key={opt.value}
                          className='flex items-center gap-2 text-sm'
                        >
                          <input type='radio' disabled />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'checkbox' ? (
                    <div className='space-y-1'>
                      {f.options?.map((opt: RSVPFieldOption) => (
                        <label
                          key={opt.value}
                          className='flex items-center gap-2 text-sm'
                        >
                          <input type='checkbox' disabled />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      className='w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm bg-white'
                      type='text'
                      placeholder={f.placeholder}
                      readOnly
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='p-4 border-t border-[#e4e4e7] flex items-center gap-3'>
        <Button disabled={saving} onClick={handleSaveClick} size='lg'>
          {saving ? '保存中...' : '保存配置'}
        </Button>
        {configId ? (
          <span className='text-xs text-gray-500'>ID: {configId}</span>
        ) : null}
      </div>

      <FieldEditorDialog
        key={editingField?.id || 'new'}
        field={editingField}
        open={showFieldEditor}
        onOpenChange={setShowFieldEditor}
        onSave={(field: RSVPField) => {
          if (field.id && fields.find((f: RSVPField) => f.id === field.id)) {
            updateField(field.id, field);
          } else {
            setFields([...fields, { ...field, id: `field_${Date.now()}` }]);
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
  onEdit: () => void;
  onDelete: () => void;
}

function FieldItem({ field, onEdit, onDelete }: FieldItemProps) {
  const fieldTypeLabel = fieldTypes.find(t => t.value === field.type)?.label;

  return (
    <div className='p-2 flex items-center justify-start border border-[#e4e4e7] rounded-md gap-2'>
      <div className='flex-1'>
        <div className='flex items-center font-semibold text-sm leading-5'>
          {field.label}
          {field.required && <span className='text-red-500 ml-0.5'>*</span>}
          <span className='ml-2 font-normal text-xs leading-5 text-black/60'>
            {fieldTypeLabel}
          </span>
        </div>
        {field.options && ['radio', 'checkbox'].includes(field.type) && (
          <div className='flex items-center gap-1 mt-1 flex-wrap'>
            {field.options.map((opt, idx) => (
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
      <div
        className='flex items-center gap-1 text-[#3358D4] cursor-pointer'
        onClick={onEdit}
      >
        <Icon name='edit' size={16} />
        <span className='text-xs flex-shrink-0'>编辑</span>
      </div>
      <Icon
        name='delete-g8c551hn'
        size={16}
        onClick={onDelete}
        className='cursor-pointer'
      />
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
  const initialField = field || {
    id: '',
    type: 'text',
    label: '',
    required: false,
    placeholder: '',
  };

  const [localField, setLocalField] = useState<RSVPField>(initialField);

  const updateLocalField = (patch: Partial<RSVPField>) => {
    setLocalField(prev => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    if (!localField.label) {
      return;
    }
    onSave(localField);
  };

  const optionsText =
    localField.options?.map(o => o.label).join('，') ||
    '选项一，选项二，选项三';

  const parseOptions = (text: string): RSVPFieldOption[] => {
    return text
      .split(/[，,\s]+/)
      .filter(Boolean)
      .map((label, idx) => ({ label, value: String(idx + 1) }));
  };

  return (
    <ResponsiveDialog isOpen={open} onOpenChange={onOpenChange}>
      <div>
        <div className='font-semibold text-base leading-6 text-[#09090b] text-center py-3 px-4'>
          {localField.id ? '修改自定义字段' : '添加自定义字段'}
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
            字段名称
          </div>
          <Input
            value={localField.label}
            onChange={e => updateLocalField({ label: e.target.value })}
            placeholder='请输入，如：联系方式'
            className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
          />
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
            字段类型
          </div>
          <div className='flex items-center gap-2 mb-2'>
            {fieldTypes.map(type => (
              <div
                key={type.value}
                className={cls(
                  'relative flex-1 border rounded-md h-[38px] text-center text-sm leading-[38px] cursor-pointer',
                  localField.type === type.value
                    ? 'font-semibold text-[var(--theme-color)] border-[var(--theme-color)] bg-[var(--theme-background-color)] pointer-events-none'
                    : 'border-[#f4f4f5] bg-[#f4f4f5] text-[#18181b]'
                )}
                onClick={() => {
                  updateLocalField({
                    type: type.value,
                    options:
                      type.value === 'radio' || type.value === 'checkbox'
                        ? localField.options || [
                            { label: '选项一', value: '1' },
                            { label: '选项二', value: '2' },
                          ]
                        : undefined,
                  });
                }}
              >
                {type.label}
                {localField.type === type.value && (
                  <Icon
                    className='absolute -bottom-px -right-px'
                    name='selected'
                    size={20}
                  />
                )}
              </div>
            ))}
          </div>
          {['radio', 'checkbox'].includes(localField.type) && (
            <div className='p-3 bg-[#fafafa] rounded-lg mt-2'>
              <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
                选项配置
              </div>
              <textarea
                className='p-3 w-full border border-black/[0.06] resize-none bg-white rounded-lg text-sm leading-[22px] text-black/[0.88] min-h-[80px]'
                placeholder='请输入，如：是，否，不确定'
                value={optionsText}
                onChange={e => {
                  updateLocalField({ options: parseOptions(e.target.value) });
                }}
              />
              {localField.options && localField.options.length > 0 && (
                <>
                  <div className='text-xs leading-5 mt-2 mb-1'>选项预览</div>
                  <div className='flex items-center gap-1 flex-wrap'>
                    {localField.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className='border border-[#e4e4e7] bg-[#f4f4f5] rounded px-2 py-0.5 text-xs font-semibold leading-[18px] text-[#09090b]'
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className='px-4 mb-5'>
          <div className='font-semibold text-sm leading-5 text-[#09090b] mb-1.5'>
            占位文本（可选）
          </div>
          <Input
            value={localField.placeholder || ''}
            onChange={e => updateLocalField({ placeholder: e.target.value })}
            placeholder='如：请输入您的姓名'
            className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
          />
        </div>

        <div className='px-4 mb-5'>
          <div
            className='flex items-center gap-1 cursor-pointer'
            onClick={() => {
              updateLocalField({ required: !localField.required });
            }}
          >
            {localField.required ? (
              <Icon
                size={20}
                name='danxuan-yixuan'
                color='var(--theme-color)'
              />
            ) : (
              <Icon size={20} name='danxuan-weixuan' color='#E4E4E7' />
            )}
            <span className='text-sm leading-5 text-black/[0.88]'>
              设为必填字段
            </span>
          </div>
        </div>

        <div className='w-full p-4 flex items-center gap-2 border-t border-[#e4e4e7]'>
          <Button
            size='lg'
            variant='outline'
            className='flex-1 hover:bg-transparent'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button size='lg' className='flex-1' onClick={handleSave}>
            {localField.id ? '保存' : '添加字段'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
