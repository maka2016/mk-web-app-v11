'use client';
import { getCookie, setCookie } from '@/components/viewer/utils/helper';
import { trpc } from '@/utils/trpc';
import styled from '@emotion/styled';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveDialog } from '../../Drawer';
import { RSVPConfigPanel } from '../configPanel';
import { RSVPProvider, useRSVP } from '../RSVPContext';
import { RSVPAttrs, RSVPField } from '../type';

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
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmissionGroupId, setLastSubmissionGroupId] = useState<
    string | null
  >(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false); // 是否已提交成功
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]); // 提交历史记录

  // 访客模式下的访客ID和联系人ID
  const [visitorId, setVisitorId] = useState<string>('');
  const [contactId, setContactId] = useState<string | null>(null);

  const deadlinePassed = useMemo(() => {
    if (!config?.submit_deadline) return false;
    const d = new Date(config.submit_deadline);
    return Date.now() > d.getTime();
  }, [config?.submit_deadline]);

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
            setSubmissionHistory(submissions);
            setSubmitted(true);

            // 设置最新的提交记录信息
            const latest = submissions[0];
            if (latest) {
              setLastSubmissionGroupId(latest.submission_group_id);
              setWillAttend(latest.will_attend);

              // 设置结果消息
              if (latest.status === 'approved') {
                setResultMsg('提交成功，已确认');
              } else if (latest.status === 'pending') {
                setResultMsg('提交成功，等待审核');
              } else if (latest.status === 'rejected') {
                setResultMsg('提交已拒绝');
              } else {
                setResultMsg('提交成功');
              }
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
          } else {
            // 没有提交记录，但如果有 contact_id，加载历史记录用于显示
            if (contactId) {
              trpc.rsvp.getSubmissionsByContactId
                .query({ contact_id: contactId })
                .then((historyData: any) => {
                  const currentFormSubmissions = (historyData as any[]).filter(
                    (s: any) => s.form_config_id === config.id
                  );
                  setSubmissionHistory(currentFormSubmissions);
                })
                .catch(() => {
                  // 忽略错误
                });
            }
          }
        })
        .catch(() => {
          // 忽略错误
        });
    }
  }, [isViewerMode, visitorId, contactId, config?.id]);

  // 初始化表单值
  useEffect(() => {
    if (config && fields.length > 0) {
      const initValues: Record<string, any> = {};
      fields.forEach(f => {
        if (typeof f.defaultValue !== 'undefined') {
          initValues[f.id] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          initValues[f.id] = [];
        } else {
          initValues[f.id] = values[f.id] || '';
        }
      });
      setValues(prev => {
        // 只在字段变化时更新，保留已有的值
        const hasNewFields = fields.some(f => !prev.hasOwnProperty(f.id));
        if (hasNewFields) {
          return { ...prev, ...initValues };
        }
        return prev;
      });
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

  const handleSubmit = async (willAttendValue: boolean) => {
    if (!config) return;

    // 公开访客必须填写姓名
    if (isGuest && !guestName.trim()) {
      setResultMsg('请输入您的姓名');
      return;
    }

    // 如果选择出席，需要验证表单
    if (willAttendValue) {
      const err = validate();
      if (err) {
        setResultMsg(err);
        return;
      }
    }

    setSubmitting(true);
    setResultMsg(null);
    try {
      // 构建提交数据，包含访客类型和姓名信息
      const submissionData = willAttendValue ? values : {};

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

      // 提交成功后重新加载历史记录
      const finalContactId = returnedContactId || contactId;
      if (isViewerMode && finalContactId) {
        try {
          const historyData = await trpc.rsvp.getSubmissionsByContactId.query({
            contact_id: finalContactId,
          });
          const currentFormSubmissions = (historyData as any[]).filter(
            (s: any) => s.form_config_id === config.id
          );
          setSubmissionHistory(currentFormSubmissions);
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

  const handleResubmit = () => {
    // 重置状态，回到表单
    setSubmitted(false);
    setResultMsg(null);
    setWillAttend(null);
    // 重置表单值
    const fields: RSVPField[] = (config as any)?.form_fields?.fields || [];
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
    const latestSubmission = submissionHistory[0];
    return (
      <FormCompWrapper className='w-full max-w-xl mx-auto space-y-4'>
        <div className='text-center py-8'>
          <div className='text-2xl font-semibold text-green-600 mb-2'>
            ✓ {resultMsg}
          </div>
          {latestSubmission && (
            <div className='text-sm text-gray-600 mt-2'>
              {latestSubmission.will_attend ? '您已确认出席' : '您已确认不出席'}
            </div>
          )}
          {config.require_approval &&
            latestSubmission?.status === 'pending' && (
              <div className='text-sm text-gray-500 mt-2'>
                您的提交已收到，请等待审核结果
              </div>
            )}
          {submissionHistory.length > 0 && (
            <div className='mt-6'>
              <div className='text-sm font-medium mb-3'>您的提交记录：</div>
              <div className='space-y-2'>
                {submissionHistory.slice(0, 3).map((submission, idx) => (
                  <div
                    key={submission.id}
                    className='border rounded p-3 text-left text-sm'
                  >
                    <div className='font-medium'>
                      提交 #{submissionHistory.length - idx}
                      {submission.will_attend ? (
                        <span className='ml-2 text-green-600'>出席</span>
                      ) : (
                        <span className='ml-2 text-gray-500'>不出席</span>
                      )}
                    </div>
                    <div className='text-gray-500 text-xs mt-1'>
                      {new Date(submission.create_time).toLocaleString('zh-CN')}
                    </div>
                    <div className='text-gray-500 text-xs mt-1'>
                      状态:{' '}
                      {submission.status === 'approved'
                        ? '已确认'
                        : submission.status === 'pending'
                          ? '待审核'
                          : submission.status === 'rejected'
                            ? '已拒绝'
                            : '已取消'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 再次提交按钮 */}
          {config.allow_multiple_submit !== false && (
            <div className='mt-6 flex justify-center'>
              <Button size='lg' onClick={handleResubmit}>
                再次提交
              </Button>
            </div>
          )}
        </div>
      </FormCompWrapper>
    );
  }

  return (
    <>
      <FormCompWrapper
        className='w-full max-w-xl mx-auto space-y-4'
        style={
          editorSDK
            ? {}
            : {
                pointerEvents: 'auto',
              }
        }
      >
        <div>
          <div className='text-lg font-medium'>{displayTitle}</div>
          {config.desc ? (
            <div className='text-sm text-gray-500 mt-1'>{config.desc}</div>
          ) : null}
          {/* 如果有被邀请人姓名且不是公开访客，显示「不是本人」按钮 */}
          {inviteeName &&
            !isGuest &&
            willAttend === null &&
            !submitting &&
            !resultMsg && (
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
        {isGuest && !willAttend && (
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

        {/* 如果还未选择出席/不出席，显示选择按钮 */}
        {willAttend === null && !submitting && !resultMsg && (
          <div className='flex items-center gap-3 pt-2'>
            <Button
              size='lg'
              disabled={submitting || (isGuest && !guestName.trim())}
              onClick={() => setWillAttend(true)}
              className='flex-1'
            >
              出席
            </Button>
            <Button
              size='lg'
              variant='secondary'
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
