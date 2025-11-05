'use client';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Check } from 'lucide-react';
import { RSVPField } from '../type';

const FormCompWrapper = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 10px;
`;

interface SubmissionViewProps {
  resultMsg: string;
  latestSubmission: any;
  onResubmit: () => void;
  allowMultipleSubmit?: boolean;
  fields: RSVPField[];
  inviteeName?: string;
}

export function SubmissionView({
  resultMsg,
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

  // 获取联系信息（优先从提交数据中获取，如果没有则从字段中查找）
  const getContactInfo = (): string => {
    // 先尝试从提交数据中获取电话或邮箱
    const phone =
      submissionData._inviteeInfo?.inviteePhone ||
      submissionData._guestInfo?.guestPhone;
    const email =
      submissionData._inviteeInfo?.inviteeEmail ||
      submissionData._guestInfo?.guestEmail;

    if (phone) return phone;
    if (email) return email;

    // 从字段中查找手机号字段
    const phoneField = fields.find(
      f =>
        f.type === 'text' &&
        (f.label.includes('手机') ||
          f.label.includes('电话') ||
          f.label.includes('Mobile'))
    );
    if (phoneField && submissionData[phoneField.id]) {
      return String(submissionData[phoneField.id]);
    }

    return '-';
  };

  // 获取客人数量
  const getGuestCount = (): string => {
    const guestField = fields.find(f => f.type === 'guest_count');
    if (!guestField) return '1 人';

    const value = submissionData[guestField.id];
    if (!value || typeof value !== 'object') return '1 人';

    if (guestField.splitAdultChild) {
      const adult = (value as any).adult || 0;
      const child = (value as any).child || 0;
      const total = adult + child;
      return total > 0 ? `${total} 人` : '1 人';
    } else {
      const total = (value as any).total || 0;
      return total > 0 ? `${total} 人` : '1 人';
    }
  };

  // 获取字段显示值
  const getFieldDisplayValue = (field: RSVPField): string => {
    const value = submissionData[field.id];
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    if (field.type === 'checkbox') {
      // checkbox 是多选，值是数组
      const selectedValues = Array.isArray(value) ? value : [];
      if (selectedValues.length === 0) return '-';

      return selectedValues
        .map(val => {
          const option = field.options?.find(opt => opt.value === val);
          return option?.label || val;
        })
        .join('、');
    } else if (field.type === 'radio') {
      // radio 是单选，值是字符串
      const option = field.options?.find(opt => opt.value === value);
      return option?.label || String(value);
    } else if (field.type === 'guest_count') {
      // guest_count 类型：如果是对象，显示人数
      if (typeof value === 'object' && value !== null) {
        if (field.splitAdultChild) {
          const adult = (value as any).adult || 0;
          const child = (value as any).child || 0;
          if (adult === 0 && child === 0) return '-';
          if (adult > 0 && child > 0) {
            return `大人 ${adult} 人，小孩 ${child} 人（共 ${adult + child} 人）`;
          } else if (adult > 0) {
            return `大人 ${adult} 人`;
          } else {
            return `小孩 ${child} 人`;
          }
        } else {
          const total = (value as any).total || 0;
          return total > 0 ? `${total} 人` : '-';
        }
      }
      return '-';
    } else {
      // text 类型直接显示
      return String(value);
    }
  };

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

        {/* 详情框 */}
        <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
          <div className='flex items-center justify-between py-2 border-b border-gray-200 last:border-0'>
            <div className='text-sm text-gray-700'>客人</div>
            <div className='text-sm font-medium text-gray-900'>
              {getGuestCount()}
            </div>
          </div>
          <div className='flex items-center justify-between py-2'>
            <div className='text-sm text-gray-700'>联系信息</div>
            <div className='text-sm font-medium text-gray-900'>
              {getContactInfo()}
            </div>
          </div>
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
