'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
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

export default function RSVPConfigPanel({ attrs, editorSDK, layer }: Props) {
  const { formConfigId, worksId } = attrs;
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
    const id = `field_${Date.now()}`;
    setFields(prev => [
      ...prev,
      {
        id,
        type: 'text',
        label: '未命名字段',
        required: false,
        placeholder: '',
      },
    ]);
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
    <div className='space-y-6'>
      {error ? <div className='text-red-500 text-sm'>{error}</div> : null}

      <section className='space-y-3'>
        <div>
          <label className='block text-sm font-medium mb-1'>标题</label>
          <input
            className='w-full border rounded px-3 py-2 text-sm'
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='如：我要报名'
          />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>描述</label>
          <textarea
            className='w-full border rounded px-3 py-2 text-sm'
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder='补充说明（可选）'
          />
        </div>

        <div className='flex items-center gap-3 text-sm'>
          <label className='flex items-center gap-2'>
            <input
              type='checkbox'
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            开启（enabled）
          </label>
          <label className='flex items-center gap-2'>
            <input
              type='checkbox'
              checked={allowMultiple}
              onChange={e => setAllowMultiple(e.target.checked)}
            />
            允许多次提交
          </label>
          <label className='flex items-center gap-2'>
            <input
              type='checkbox'
              checked={requireApproval}
              onChange={e => setRequireApproval(e.target.checked)}
            />
            需要审核
          </label>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <label className='block text-sm font-medium mb-1'>
              最大提交次数（留空不限）
            </label>
            <input
              className='w-full border rounded px-3 py-2 text-sm'
              type='number'
              value={maxSubmitCount}
              onChange={e =>
                setMaxSubmitCount(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
            />
          </div>
          <div className='flex-1'>
            <label className='block text-sm font-medium mb-1'>
              截止时间（可选）
            </label>
            <input
              className='w-full border rounded px-3 py-2 text-sm'
              type='datetime-local'
              value={submitDeadline}
              onChange={e => setSubmitDeadline(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='text-sm font-medium'>自定义字段</div>
          <Button size='sm' onClick={addField}>
            新增字段
          </Button>
        </div>
        <div className='space-y-4'>
          {fields.map(f => (
            <div key={f.id} className='border rounded p-3 space-y-2'>
              <div className='flex items-center gap-3'>
                <div className='flex-1'>
                  <label className='block text-xs text-gray-500 mb-1'>
                    字段 ID
                  </label>
                  <input
                    className='w-full border rounded px-2 py-1 text-sm'
                    value={f.id}
                    onChange={e => updateField(f.id, { id: e.target.value })}
                  />
                </div>
                <div className='w-44'>
                  <label className='block text-xs text-gray-500 mb-1'>
                    类型
                  </label>
                  <select
                    className='w-full border rounded px-2 py-1 text-sm'
                    value={f.type}
                    onChange={e =>
                      updateField(f.id, { type: e.target.value as FieldType })
                    }
                  >
                    <option value='text'>文本</option>
                    <option value='number'>数字</option>
                    <option value='textarea'>长文本</option>
                    <option value='radio'>单选</option>
                    <option value='checkbox'>多选</option>
                  </select>
                </div>
                <div className='w-44'>
                  <label className='block text-xs text-gray-500 mb-1'>
                    必填
                  </label>
                  <select
                    className='w-full border rounded px-2 py-1 text-sm'
                    value={f.required ? '1' : '0'}
                    onChange={e =>
                      updateField(f.id, { required: e.target.value === '1' })
                    }
                  >
                    <option value='1'>是</option>
                    <option value='0'>否</option>
                  </select>
                </div>
                <div className='w-28 text-right'>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => removeField(f.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <div className='flex-1'>
                  <label className='block text-xs text-gray-500 mb-1'>
                    标签
                  </label>
                  <input
                    className='w-full border rounded px-2 py-1 text-sm'
                    value={f.label}
                    onChange={e => updateField(f.id, { label: e.target.value })}
                  />
                </div>
                <div className='flex-1'>
                  <label className='block text-xs text-gray-500 mb-1'>
                    占位文本
                  </label>
                  <input
                    className='w-full border rounded px-2 py-1 text-sm'
                    value={f.placeholder || ''}
                    onChange={e =>
                      updateField(f.id, { placeholder: e.target.value })
                    }
                  />
                </div>
              </div>

              {f.type === 'radio' || f.type === 'checkbox' ? (
                <div className='space-y-2'>
                  <div className='text-xs text-gray-500'>选项</div>
                  <div className='space-y-2'>
                    {(f.options && f.options.length > 0
                      ? f.options
                      : [{ label: '选项A', value: 'A' }]
                    ).map((opt, idx) => (
                      <div key={idx} className='flex items-center gap-2'>
                        <input
                          className='flex-1 border rounded px-2 py-1 text-sm'
                          value={opt.label}
                          onChange={e =>
                            updateField(f.id, {
                              options: (
                                f.options || [{ label: '选项A', value: 'A' }]
                              ).map((o, i) =>
                                i === idx ? { ...o, label: e.target.value } : o
                              ),
                            })
                          }
                        />
                        <input
                          className='w-44 border rounded px-2 py-1 text-sm'
                          value={opt.value}
                          onChange={e =>
                            updateField(f.id, {
                              options: (
                                f.options || [{ label: '选项A', value: 'A' }]
                              ).map((o, i) =>
                                i === idx ? { ...o, value: e.target.value } : o
                              ),
                            })
                          }
                        />
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() =>
                            updateField(f.id, {
                              options: (
                                f.options || [{ label: '选项A', value: 'A' }]
                              ).filter((_, i) => i !== idx),
                            })
                          }
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    size='sm'
                    onClick={() =>
                      updateField(f.id, {
                        options: [
                          ...(f.options || []),
                          {
                            label: `选项${(f.options?.length || 0) + 1}`,
                            value: String((f.options?.length || 0) + 1),
                          },
                        ],
                      })
                    }
                  >
                    新增选项
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className='flex items-center gap-3'>
        <Button disabled={saving} onClick={handleSave}>
          {saving ? '保存中...' : '保存配置'}
        </Button>
        {configId ? (
          <span className='text-xs text-gray-500'>ID: {configId}</span>
        ) : null}
      </div>

      <section className='space-y-3'>
        <div className='text-sm font-medium'>预览</div>
        <div className='border rounded p-3 space-y-3'>
          <div className='text-base font-medium'>{title}</div>
          {desc ? <div className='text-sm text-gray-500'>{desc}</div> : null}
          <div className='space-y-3'>
            {previewFields.map(f => (
              <div key={f.id}>
                <label className='block text-sm mb-1'>
                  {f.label}
                  {f.required ? ' *' : ''}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    className='w-full border rounded px-3 py-2 text-sm'
                    placeholder={f.placeholder}
                    readOnly
                  />
                ) : f.type === 'number' ? (
                  <input
                    className='w-full border rounded px-3 py-2 text-sm'
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
                    className='w-full border rounded px-3 py-2 text-sm'
                    type='text'
                    placeholder={f.placeholder}
                    readOnly
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
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
