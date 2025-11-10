'use client';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { RSVPField } from '../type';
import { SubmissionDataView } from './SubmissionDataView';

const FormCompWrapper = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background-color: var(--rsvp-bg-color, #fff);
  border-radius: var(--rsvp-border-radius, 10px);
  border: var(--rsvp-border-width, 0px) solid
    var(--rsvp-border-color, transparent);
  box-shadow: var(--rsvp-box-shadow, none);
  font-size: var(--rsvp-control-font-size, 14px);

  /* 使用配置的 backdrop-filter 值 */
  backdrop-filter: var(--rsvp-backdrop-filter, none);
  -webkit-backdrop-filter: var(--rsvp-backdrop-filter, none);
`;

interface SubmissionViewProps {
  latestSubmission: any;
  onResubmit: () => void;
  allowMultipleSubmit?: boolean;
  fields: RSVPField[];
  inviteeName?: string;
  themeStyle?: React.CSSProperties;
  needsBackdropFilter?: boolean;
}

export function SubmissionView({
  latestSubmission,
  onResubmit,
  allowMultipleSubmit = true,
  fields,
  inviteeName,
  themeStyle,
  needsBackdropFilter = false,
}: SubmissionViewProps) {
  // 获取提交的表单数据
  const submissionData = latestSubmission?.submission_data || {};

  // 获取出席状态
  const willAttend = latestSubmission?.will_attend;

  // 获取被邀请人姓名（从提交数据或props中获取）
  const displayName =
    inviteeName ||
    submissionData._inviteeInfo?.inviteeName ||
    submissionData._guestInfo?.guestName ||
    '';

  return (
    <FormCompWrapper
      className='w-full max-w-xl mx-auto relative z-10'
      data-has-backdrop-filter={needsBackdropFilter ? 'true' : 'false'}
      style={themeStyle}
    >
      <div className='text-center py-8'>
        {/* 图标 */}
        <div className='flex justify-center mb-8'>
          {willAttend ? (
            <div className='text-5xl'>✅</div>
          ) : (
            <div className='text-5xl'>📝</div>
          )}
        </div>

        {/* 标题 */}
        <div
          className='text-xl font-semibold mb-2'
          style={{
            color: 'var(--rsvp-text-color, #111827)',
          }}
        >
          {willAttend ? '确认出席' : '回复已收到'}
        </div>

        {/* 说明文字 */}
        {willAttend ? (
          displayName && (
            <div
              className='text-sm mb-6'
              style={{
                color: 'var(--rsvp-text-color, #374151)',
              }}
            >
              感谢您，{displayName}，期待您的到来
            </div>
          )
        ) : (
          <div
            className='text-sm mb-6'
            style={{
              color: 'var(--rsvp-label-color, #4b5563)',
            }}
          >
            我们已收到您的回复，感谢您的告知
          </div>
        )}

        {/* 详情框 - 仅在出席时显示表单数据 */}
        {willAttend && (
          <div
            className='rounded-lg p-4 mb-6 text-left'
            style={{
              backgroundColor: 'var(--rsvp-input-bg-color, #f9fafb)',
              borderRadius: 'var(--rsvp-border-radius, 8px)',
            }}
          >
            <SubmissionDataView
              submissionData={submissionData}
              fields={fields}
              showOnlyWithValues={true}
              showEmptyState={true}
            />
          </div>
        )}

        {/* 编辑回复链接 */}
        {allowMultipleSubmit !== false && (
          <div className='mt-4'>
            <Button
              variant='link'
              className='p-0 h-auto font-normal'
              style={{
                color: 'var(--rsvp-primary-btn-color, #2563eb)',
                fontSize: 'var(--rsvp-control-font-size, 14px)',
              }}
              onClick={onResubmit}
            >
              编辑回复
            </Button>
          </div>
        )}
      </div>
    </FormCompWrapper>
  );
}
