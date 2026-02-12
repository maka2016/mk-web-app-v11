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
  successFeedbackConfig?: {
    success_message?: string | null;
    success_image?: string | null;
  } | null; // 自定义成功反馈配置
  style?: React.CSSProperties;
}

export function SubmissionView({
  style,
  latestSubmission,
  onResubmit,
  allowMultipleSubmit = true,
  fields,
  inviteeName,
  themeStyle,
  needsBackdropFilter = false,
  successFeedbackConfig,
}: SubmissionViewProps) {
  // 获取提交的表单数据
  const submissionData = latestSubmission?.submission_data || {};

  // 获取被邀请人姓名（从提交数据或props中获取）
  const displayName =
    inviteeName ||
    submissionData._inviteeInfo?.inviteeName ||
    submissionData._guestInfo?.guestName ||
    submissionData.name ||
    '';

  // 使用自定义成功反馈或默认值
  const displayMessage =
    successFeedbackConfig?.success_message ||
    '我们已收到您的回复，感谢您的告知';
  const displayImage = successFeedbackConfig?.success_image;

  return (
    <FormCompWrapper
      className='w-full max-w-xl mx-auto relative z-10 h-full overflow-y-auto'
      data-has-backdrop-filter={needsBackdropFilter ? 'true' : 'false'}
      style={{ ...themeStyle, ...style }}
    >
      <div className='text-center py-8'>
        {/* 自定义图片或默认图标 */}
        <div className='flex justify-center mb-8'>
          {displayImage ? (
            <img
              src={displayImage}
              alt='成功提示'
              className='max-w-full h-auto rounded-md'
              style={{ maxHeight: '200px' }}
            />
          ) : (
            <div className='text-5xl'>✅</div>
          )}
        </div>

        {/* 标题 */}
        <div
          className='text-xl font-semibold mb-2'
          style={{
            color: 'var(--rsvp-label-color, #111827)',
          }}
        >
          提交成功
        </div>

        {/* 说明文字 */}
        <div
          className='text-sm mb-6'
          style={{
            color: 'var(--rsvp-label-color, #4b5563)',
          }}
        >
          {displayMessage}
        </div>

        {/* 详情框 - 显示表单数据 */}
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

        {/* 重新填写 */}
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
              重新填写
            </Button>
          </div>
        )}
      </div>
    </FormCompWrapper>
  );
}
