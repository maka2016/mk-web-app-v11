'use client';
import { BtnLite } from '@/components/GridV3/shared/style-comps';
import { trpc } from '@/utils/trpc';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import cls from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveDialog as LocalDialog } from '../../Drawer';
import { RSVPAttrs } from '../type';

type FieldType = 'text' | 'number' | 'textarea' | 'radio' | 'checkbox';

interface RSVPFieldOption {
  label: string;
  value: string;
}

interface RSVPField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: RSVPFieldOption[]; // for radio/checkbox
  defaultValue?: any;
}

interface Props {
  attrs: RSVPAttrs;
  editorSDK?: EditorSDK;
  layer: LayerElemItem;
}

export default function RSVPConfigPanelTrigger({
  attrs,
  editorSDK,
  layer,
}: Props) {
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);
  return (
    <>
      <BtnLite
        title='RSVP配置'
        onClick={() => {
          setShowTextEditDialog(true);
        }}
      >
        <Icon name='form-fill' size={20} />
        <span>RSVP配置</span>
      </BtnLite>
      <LocalDialog
        isOpen={showTextEditDialog}
        onOpenChange={setShowTextEditDialog}
      >
        <RSVPConfigPanel attrs={attrs} editorSDK={editorSDK} layer={layer} />
      </LocalDialog>
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

function RSVPConfigPanel({ attrs }: Props) {
  const { worksId } = attrs;
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [configId, setConfigId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('我要报名');
  const [desc, setDesc] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [allowMultiple, setAllowMultiple] = useState<boolean>(false);
  const [requireApproval, setRequireApproval] = useState<boolean>(true);
  const [maxSubmitCount, setMaxSubmitCount] = useState<number | ''>('');
  const [submitDeadline, setSubmitDeadline] = useState<string>('');
  const [fields, setFields] = useState<RSVPField[]>([]);

  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<RSVPField | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const existing = await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: worksId,
        });
        if (!mounted) return;
        if (existing) {
          setConfigId((existing as any).id);
          setTitle((existing as any).title || '');
          setDesc((existing as any).desc || '');
          setEnabled((existing as any).enabled !== false);
          setAllowMultiple(Boolean((existing as any).allow_multiple_submit));
          setRequireApproval((existing as any).require_approval !== false);
          setMaxSubmitCount((existing as any).max_submit_count ?? '');
          const deadline = (existing as any).submit_deadline
            ? new Date((existing as any).submit_deadline)
            : null;
          setSubmitDeadline(deadline ? toLocalDateTimeValue(deadline) : '');
          setFields(
            ((existing as any).form_fields?.fields || []) as RSVPField[]
          );
        } else {
          // defaults
          setEnabled(true);
          setRequireApproval(true);
          setAllowMultiple(false);
          setFields([]);
        }
      } catch (e: any) {
        setError(String(e?.message || '加载失败'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [worksId]);

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
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<RSVPField>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        works_id: worksId,
        title: title || '我要报名',
        desc,
        form_fields: { fields: fields.map(ensureOptions) },
        allow_multiple_submit: allowMultiple,
        require_approval: requireApproval,
        max_submit_count: maxSubmitCount === '' ? null : Number(maxSubmitCount),
        submit_deadline: submitDeadline ? new Date(submitDeadline) : null,
        enabled: enabled !== false,
      } as any;

      const saved = await trpc.rsvp.upsertFormConfig.mutate(payload);
      setConfigId((saved as any).id);
    } catch (e: any) {
      setError(String(e?.message || '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const previewFields = useMemo(() => fields.map(ensureOptions), [fields]);

  if (loading) {
    return (
      <div className='w-full py-4 text-center text-sm text-gray-500'>
        加载中...
      </div>
    );
  }

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
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder='补充说明（可选）'
            />
          </div>
        </div>

        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            提交规则
          </div>
          <div className='flex items-center gap-4 my-2'>
            <label className='flex items-center gap-1 text-xs leading-[18px] text-[#09090B] cursor-pointer'>
              <input
                type='checkbox'
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
              />
              开启
            </label>
            <label className='flex items-center gap-1 text-xs leading-[18px] text-[#09090B] cursor-pointer'>
              <input
                type='checkbox'
                checked={allowMultiple}
                onChange={e => setAllowMultiple(e.target.checked)}
              />
              允许多次提交
            </label>
            <label className='flex items-center gap-1 text-xs leading-[18px] text-[#09090B] cursor-pointer'>
              <input
                type='checkbox'
                checked={requireApproval}
                onChange={e => setRequireApproval(e.target.checked)}
              />
              需要审核
            </label>
          </div>

          <div className='flex items-center gap-3 mt-3'>
            <div className='flex-1'>
              <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                最大提交次数
              </div>
              <Input
                className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                type='number'
                value={maxSubmitCount}
                onChange={e =>
                  setMaxSubmitCount(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder='留空不限'
              />
            </div>
            <div className='flex-1'>
              <div className='font-semibold text-xs leading-[18px] text-[#0A0A0A] mb-1'>
                截止时间
              </div>
              <Input
                className='w-full bg-[#F3F3F5] border-none rounded-md px-3 py-2 text-xs'
                type='datetime-local'
                value={submitDeadline}
                onChange={e => setSubmitDeadline(e.target.value)}
              />
            </div>
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
            {fields.map((f, index) => (
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
            {desc ? (
              <div className='text-[13px] leading-5 text-black/60 mt-1'>
                {desc}
              </div>
            ) : null}
            <div className='mt-4 space-y-3'>
              {previewFields.map(f => (
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
                      {f.options?.map(opt => (
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
                      {f.options?.map(opt => (
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
        <Button disabled={saving} onClick={handleSave} size='lg'>
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
        onSave={field => {
          if (field.id && fields.find(f => f.id === field.id)) {
            updateField(field.id, field);
          } else {
            setFields(prev => [
              ...prev,
              { ...field, id: `field_${Date.now()}` },
            ]);
          }
          setShowFieldEditor(false);
        }}
      />
    </div>
  );
}

function toLocalDateTimeValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
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
  // Use field as initial value directly
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
