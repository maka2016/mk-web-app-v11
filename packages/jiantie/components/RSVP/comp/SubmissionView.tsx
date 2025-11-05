'use client';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Check } from 'lucide-react';
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

  // 获取被邀请人姓名（从提交数据或props中获取）
  const displayName =
    inviteeName ||
    submissionData._inviteeInfo?.inviteeName ||
    submissionData._guestInfo?.guestName ||
    '';

  return (
    <FormCompWrapper className='w-full max-w-xl mx-auto'>
      <div className='text-center py-8'>
        {/* 绿色勾选图标 */}
        <div className='flex justify-center mb-4'>
          <div className='h-16 w-16 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg'>
            <Check className='h-8 w-8 text-white' strokeWidth={3} />
          </div>
        </div>

        {/* 标题：确认出席 */}
        <div className='text-xl font-semibold text-gray-900 mb-2'>确认出席</div>

        {/* 感谢消息 */}
        {displayName && (
          <div className='text-sm text-gray-700 mb-6'>
            感谢您，{displayName}，期待您的到来
          </div>
        )}

        {/* 详情框 - 动态渲染所有提交的字段 */}
        <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
          <SubmissionDataView
            submissionData={submissionData}
            fields={fields}
            showOnlyWithValues={true}
            showEmptyState={true}
          />
        </div>

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
