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
  background-color: #fff;
  border-radius: 10px;
`;

interface SubmissionViewProps {
  latestSubmission: any;
  onResubmit: () => void;
  allowMultipleSubmit?: boolean;
  fields: RSVPField[];
  inviteeName?: string;
}

export function SubmissionView({
  latestSubmission,
  onResubmit,
  allowMultipleSubmit = true,
  fields,
  inviteeName,
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
    <FormCompWrapper className='w-full max-w-xl mx-auto'>
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
        <div className='text-xl font-semibold text-gray-900 mb-2'>
          {willAttend ? '确认出席' : '回复已收到'}
        </div>

        {/* 说明文字 */}
        {willAttend ? (
          displayName && (
            <div className='text-sm text-gray-700 mb-6'>
              感谢您，{displayName}，期待您的到来
            </div>
          )
        ) : (
          <div className='text-sm text-gray-600 mb-6'>
            我们已收到您的回复，感谢您的告知
          </div>
        )}

        {/* 详情框 - 仅在出席时显示表单数据 */}
        {willAttend && (
          <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
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
              className='text-blue-600 hover:text-blue-700 p-0 h-auto font-normal'
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
