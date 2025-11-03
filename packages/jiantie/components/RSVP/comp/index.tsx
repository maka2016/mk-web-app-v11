'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { getPageId } from '@mk/services';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { RSVPAttrs, RsvpFormConfigEntity, RSVPField } from '../type';

interface RSVPCompProps {
  attrs: RSVPAttrs;
  editorSDK: EditorSDK;
  layer: LayerElemItem;
}

export default function RSVPComp({ attrs, editorSDK, layer }: RSVPCompProps) {
  const { formConfigId, worksId } = attrs;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<RsvpFormConfigEntity | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmissionGroupId, setLastSubmissionGroupId] = useState<
    string | null
  >(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const deadlinePassed = useMemo(() => {
    if (!config?.submit_deadline) return false;
    const d = new Date(config.submit_deadline);
    return Date.now() > d.getTime();
  }, [config?.submit_deadline]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 如果既没有 formConfigId，也没有有效的 worksId，则创建一个新的
        if (editorSDK && !formConfigId && !worksId) {
          const created = await trpc.rsvp.upsertFormConfig.mutate({
            works_id: getPageId(),
            title: '我要报名',
            desc: '',
            form_fields: { fields: [] },
            allow_multiple_submit: false,
            require_approval: true,
            enabled: true,
          });
          setConfig(created as any);
          setValues({});
          setLoading(false);
          editorSDK.changeCompAttr(layer.elemId, {
            formConfigId: created.id,
            worksId: getPageId(),
          });
          return;
        }

        if (formConfigId) {
          // 有且只有formConfigId是可以查询的
          const data = await trpc.rsvp.getFormConfigById.query({
            id: formConfigId,
          });
          // 没有配置时：自动为当前作品创建一个默认配置（enabled=true）
          setConfig(data as any);
          setLoading(false);

          const fields: RSVPField[] = (data as any)?.form_fields?.fields || [];
          const initValues: Record<string, any> = {};
          fields.forEach(f => {
            if (typeof f.defaultValue !== 'undefined') {
              initValues[f.id] = f.defaultValue;
            } else if (f.type === 'checkbox') {
              initValues[f.id] = [];
            } else {
              initValues[f.id] = '';
            }
          });
          setValues(initValues);
        }
      } catch (e: any) {
        setError(String(e?.message || '加载失败'));
      } finally {
      }
    })();
    return () => {};
  }, [formConfigId, worksId]);

  const fields: RSVPField[] = useMemo(() => {
    return (config as any)?.form_fields?.fields || [];
  }, [config]);

  const handleChange = (field: RSVPField, next: any) => {
    setValues(prev => ({ ...prev, [field.id]: next }));
  };

  const validate = (): string | null => {
    for (const f of fields) {
      if (f.required) {
        const v = values[f.id];
        if (f.type === 'checkbox') {
          if (!Array.isArray(v) || v.length === 0) return `${f.label} 为必选`;
        } else if (v === undefined || v === null || String(v).trim() === '') {
          return `${f.label} 为必填`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!config) return;
    const err = validate();
    if (err) {
      setResultMsg(err);
      return;
    }
    setSubmitting(true);
    setResultMsg(null);
    try {
      const created = await trpc.rsvp.createSubmission.mutate({
        form_config_id: config.id,
        submission_data: values,
      });
      setLastSubmissionGroupId((created as any)?.submission_group_id || null);
      if (config.require_approval) {
        setResultMsg('提交成功，等待审核');
      } else {
        setResultMsg('提交成功');
      }
    } catch (e: any) {
      setResultMsg(String(e?.message || '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleModify = async () => {
    if (!config) return;
    if (!lastSubmissionGroupId) {
      setResultMsg('没有可修改的提交记录');
      return;
    }
    const err = validate();
    if (err) {
      setResultMsg(err);
      return;
    }
    setSubmitting(true);
    setResultMsg(null);
    try {
      await trpc.rsvp.updateSubmissionVersion.mutate({
        submission_group_id: lastSubmissionGroupId,
        submission_data: values,
      });
      setResultMsg('修改成功，已创建新版本');
    } catch (e: any) {
      setResultMsg(String(e?.message || '修改失败'));
    } finally {
      setSubmitting(false);
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

  return (
    <div className='w-full max-w-xl mx-auto space-y-4'>
      <div>
        <div className='text-lg font-medium'>{config.title}</div>
        {config.desc ? (
          <div className='text-sm text-gray-500 mt-1'>{config.desc}</div>
        ) : null}
      </div>

      <div className='space-y-4'>
        {fields.map(field => {
          const common = (
            <label className='block text-sm font-medium mb-1'>
              {field.label}
              {field.required ? ' *' : ''}
            </label>
          );
          if (field.type === 'textarea') {
            return (
              <div key={field.id}>
                {common}
                <textarea
                  className='w-full border rounded px-3 py-2 text-sm'
                  placeholder={field.placeholder}
                  value={values[field.id] || ''}
                  onChange={e => handleChange(field, e.target.value)}
                />
              </div>
            );
          }
          if (field.type === 'number') {
            return (
              <div key={field.id}>
                {common}
                <input
                  className='w-full border rounded px-3 py-2 text-sm'
                  type='number'
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ''}
                  onChange={e =>
                    handleChange(
                      field,
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                />
              </div>
            );
          }
          if (field.type === 'radio') {
            return (
              <div key={field.id}>
                {common}
                <div className='space-y-2'>
                  {field.options?.map(opt => (
                    <label
                      key={opt.value}
                      className='flex items-center gap-2 text-sm'
                    >
                      <input
                        type='radio'
                        name={field.id}
                        checked={values[field.id] === opt.value}
                        onChange={() => handleChange(field, opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }
          if (field.type === 'checkbox') {
            const selected: string[] = Array.isArray(values[field.id])
              ? values[field.id]
              : [];
            const toggle = (val: string) => {
              const set = new Set(selected);
              if (set.has(val)) set.delete(val);
              else set.add(val);
              handleChange(field, Array.from(set));
            };
            return (
              <div key={field.id}>
                {common}
                <div className='space-y-2'>
                  {field.options?.map(opt => (
                    <label
                      key={opt.value}
                      className='flex items-center gap-2 text-sm'
                    >
                      <input
                        type='checkbox'
                        checked={selected.includes(opt.value)}
                        onChange={() => toggle(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }
          // text
          return (
            <div key={field.id}>
              {common}
              <input
                className='w-full border rounded px-3 py-2 text-sm'
                type='text'
                placeholder={field.placeholder}
                value={values[field.id] || ''}
                onChange={e => handleChange(field, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      {resultMsg ? (
        <div className='text-sm text-gray-600'>{resultMsg}</div>
      ) : null}

      <div className='flex items-center gap-3 pt-2'>
        <Button size='sm' disabled={submitting} onClick={handleSubmit}>
          {submitting ? '提交中...' : '提交'}
        </Button>
        <Button
          size='sm'
          variant='secondary'
          disabled={submitting}
          onClick={handleModify}
        >
          {submitting ? '保存中...' : '修改'}
        </Button>
        {config.max_submit_count != null ? (
          <span className='text-xs text-gray-500'>
            限制 {config.max_submit_count} 次
          </span>
        ) : null}
      </div>
    </div>
  );
}
