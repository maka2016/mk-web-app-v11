'use client';
import { RSVPField } from '../type';

interface SubmissionDataViewProps {
  submissionData: Record<string, any>;
  fields: RSVPField[];
  className?: string;
  /** 是否只显示有值的字段，默认 true */
  showOnlyWithValues?: boolean;
  /** 自定义样式类名 */
  itemClassName?: string;
  /** 是否显示空状态提示，默认 true */
  showEmptyState?: boolean;
}

/**
 * 提交数据展示组件
 * 根据表单字段配置动态渲染提交的数据
 */
export function SubmissionDataView({
  submissionData,
  fields,
  className = '',
  showOnlyWithValues = true,
  itemClassName = '',
  showEmptyState = true,
}: SubmissionDataViewProps) {
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
            return `成人 ${adult} 人，儿童 ${child} 人（共 ${adult + child} 人）`;
          } else if (adult > 0) {
            return `成人 ${adult} 人`;
          } else {
            return `儿童 ${child} 人`;
          }
        } else {
          const total = (value as any).total || 0;
          return total > 0 ? `${total} 人` : '-';
        }
      }
      return '-';
    } else if (field.type === 'attachment') {
      // 附件类型：显示所有附件名称，使用顿号分隔
      const attachments = Array.isArray(value) ? value : [];
      if (!attachments.length) return '-';
      const names = attachments
        .map((item: any) => item?.name || item?.url)
        .filter(Boolean);
      return names.length ? names.join('、') : '-';
    } else {
      // 其它类型直接显示字符串
      return String(value);
    }
  };

  // 获取 guest_count 字段的数值（用于特殊显示）
  const getGuestCountDisplay = (
    field: RSVPField
  ): {
    adult: number;
    child: number;
    total: number;
  } | null => {
    if (field.type !== 'guest_count') return null;
    const value = submissionData[field.id];
    if (typeof value !== 'object' || value === null) return null;

    if (field.splitAdultChild) {
      const adult = (value as any).adult || 0;
      const child = (value as any).child || 0;
      return { adult, child, total: adult + child };
    } else {
      const total = (value as any).total || 0;
      return { adult: 0, child: 0, total };
    }
  };

  const enabledFields = fields.filter(field => field.enabled !== false);

  if (showOnlyWithValues) {
    const fieldsWithValues = enabledFields
      .map(field => ({
        field,
        value: getFieldDisplayValue(field),
      }))
      .filter(({ value }) => value !== '-' && value);

    if (fieldsWithValues.length === 0) {
      if (showEmptyState) {
        return (
          <div
            className={`text-sm text-center py-2 ${className}`}
            style={{
              color: 'var(--rsvp-label-color, #6b7280)',
            }}
          >
            暂无提交信息
          </div>
        );
      }
      return null;
    }

    return (
      <div className={className}>
        {fieldsWithValues.map(({ field, value }, index) => (
          <div
            key={field.id}
            className={`flex items-center justify-between py-2 ${itemClassName}`}
            style={{
              borderBottom:
                index < fieldsWithValues.length - 1
                  ? '1px solid var(--rsvp-input-border-color, #e5e7eb)'
                  : 'none',
            }}
          >
            <div className='text-sm'>
              {field.label === '访客' ? '出席人数' : field.label}
            </div>
            <div className='text-sm font-medium text-right flex-1 ml-4'>
              {value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 显示所有字段（包括空值）
  return (
    <div className={className}>
      {enabledFields.map((field, index) => {
        const value = getFieldDisplayValue(field);
        return (
          <div
            key={field.id}
            className={`flex items-center justify-between py-2 ${itemClassName}`}
            style={{
              borderBottom:
                index < enabledFields.length - 1
                  ? '1px solid var(--rsvp-input-border-color, #e5e7eb)'
                  : 'none',
            }}
          >
            <div
              className='text-sm'
              style={{
                color: 'var(--rsvp-label-color, #374151)',
              }}
            >
              {field.label === '访客' ? '出席人数' : field.label}
            </div>
            <div
              className='text-sm font-medium text-right flex-1 ml-4'
              style={{
                color: 'var(--rsvp-text-color, #111827)',
              }}
            >
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 获取 guest_count 字段的显示文本（用于简洁显示）
 */
export function getGuestCountText(
  submissionData: Record<string, any>,
  fields: RSVPField[]
): string {
  const guestField = fields.find(
    f => f.type === 'guest_count' && f.enabled !== false
  );
  if (!guestField) return '';

  const value = submissionData[guestField.id];
  if (typeof value !== 'object' || value === null) return '';

  if (guestField.splitAdultChild) {
    const adult = (value as any).adult || 0;
    const child = (value as any).child || 0;
    return `成人 ${adult} · 儿童 ${child}`;
  } else {
    const total = (value as any).total || 0;
    return `共 ${total} 人`;
  }
}
