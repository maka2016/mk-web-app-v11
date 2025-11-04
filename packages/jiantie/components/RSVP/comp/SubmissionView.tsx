'use client';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
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
}

export function SubmissionView({
  resultMsg,
  latestSubmission,
  onResubmit,
  allowMultipleSubmit = true,
  fields,
}: SubmissionViewProps) {
  // 获取提交的表单数据
  const submissionData = latestSubmission?.submission_data || {};

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
        {latestSubmission && (
          <div className='text-gray-500 text-xs mt-2'>
            {new Date(latestSubmission.create_time).toLocaleString('zh-CN')}
          </div>
        )}

        {/* 显示提交的表单字段 */}
        {latestSubmission?.will_attend && fields.length > 0 && (
          <div className='mt-6 text-left'>
            <div className='text-sm font-medium mb-3'>您的提交信息：</div>
            <div className='space-y-3'>
              {fields
                .filter(field => field.enabled !== false)
                .map(field => {
                  const displayValue = getFieldDisplayValue(field);
                  return (
                    <div
                      key={field.id}
                      className='flex items-start justify-between border-b border-gray-100 pb-2'
                    >
                      <div className='text-sm font-medium text-gray-700 flex-shrink-0 mr-4'>
                        {field.label}
                      </div>
                      <div className='text-sm text-gray-600 flex-1 text-right'>
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 再次提交按钮 */}
        {allowMultipleSubmit !== false && (
          <div className='mt-6 flex justify-center'>
            <Button size='xs' variant={'link'} onClick={onResubmit}>
              {/* 文案上显示编辑，实际上是重新提交 */}
              编辑信息
            </Button>
          </div>
        )}
      </div>
    </FormCompWrapper>
  );
}
