'use client';
import { Button } from '@workspace/ui/components/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { CheckSquare2, Circle, Minus, Plus } from 'lucide-react';
import { Control } from 'react-hook-form';
import { RSVPField } from '../type';

interface RSVPFormFieldsProps {
  fields: RSVPField[];
  control: Control<any>;
  className?: string;
  disabled?: boolean;
}

/**
 * 计数器控制组件 - 统一管理人数计数器的样式和行为
 */

interface CounterControlProps {
  className?: string;
  value: number;
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

function CounterControl({
  className,
  value,
  label,
  onIncrement,
  onDecrement,
  disabled = false,
}: CounterControlProps) {
  return (
    <div className={cn('flex-1 flex items-center gap-2', className)}>
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled}
        className='h-8 w-8 shrink-0 rounded-lg border-gray-200 bg-gray-50'
        onClick={onDecrement}
      >
        <Minus className='h-4 w-4' />
      </Button>
      <div className='flex-1 text-center'>
        <span className='text-base font-semibold text-gray-900'>{value}</span>
        <span className='text-sm text-gray-500 ml-1'>{label}</span>
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled}
        className='h-8 w-8 shrink-0 rounded-lg border-gray-200 bg-gray-50'
        onClick={onIncrement}
      >
        <Plus className='h-4 w-4' />
      </Button>
    </div>
  );
}

/**
 * 独立的 RSVP 表单字段渲染组件
 * 可以复用于任何需要显示/编辑 RSVP 表单字段的场景
 */
export function RSVPFormFields({
  fields,
  control,
  className = '',
  disabled = false,
}: RSVPFormFieldsProps) {
  // 主题已通过 CSS 变量在父组件中设置，这里不再需要 theme 参数

  return (
    <div className={`space-y-3 ${className}`}>
      {fields
        .filter(field => field.enabled !== false)
        .map(field => (
          <FormField
            key={field.id}
            control={control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className='space-y-1'>
                <FormLabel
                  className='text-xs font-medium'
                  style={{
                    lineHeight: '18px',
                    color: 'var(--rsvp-label-color)',
                  }}
                >
                  {field.label}
                  {field.required ? (
                    <span className='text-red-500 ml-1'>*</span>
                  ) : null}
                </FormLabel>
                <FormControl>
                  {field.type === 'text' ? (
                    <Input
                      placeholder={field.placeholder || '请输入' + field.label}
                      value={formField.value as string}
                      onChange={formField.onChange}
                      onBlur={formField.onBlur}
                      name={formField.name}
                      ref={formField.ref}
                      disabled={disabled}
                      className='h-11 focus:ring-0 [&::placeholder]:text-[var(--rsvp-input-placeholder-color)]'
                      style={{
                        borderRadius: 'var(--rsvp-border-radius)',
                        borderWidth: 'var(--rsvp-border-width)',
                        backgroundColor: 'var(--rsvp-input-bg-color)',
                        borderColor: 'var(--rsvp-input-border-color)',
                        color: 'var(--rsvp-input-text-color)',
                      }}
                    />
                  ) : field.type === 'radio' ? (
                    <div className='flex flex-wrap items-center gap-3'>
                      {field.options?.map(opt => {
                        const isSelected = formField.value === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={disabled}
                            className='inline-flex shrink-0 items-center gap-2'
                            style={{
                              borderRadius: 'var(--rsvp-border-radius)',
                              borderWidth: 'var(--rsvp-border-width)',
                              backgroundColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-color)',
                              color: isSelected
                                ? 'var(--rsvp-primary-btn-text-color)'
                                : 'var(--rsvp-secondary-btn-text-color)',
                              borderColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-border-color)',
                            }}
                            onClick={() => formField.onChange(opt.value)}
                          >
                            <Circle
                              className={cn(
                                'h-4 w-4',
                                isSelected ? 'fill-current' : ''
                              )}
                            />
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className='flex flex-wrap items-center gap-3'>
                      {field.options?.map(opt => {
                        const isSelected = (
                          (formField.value as string[]) || []
                        ).includes(opt.value);
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={disabled}
                            className='inline-flex shrink-0 items-center gap-2'
                            style={{
                              borderRadius: 'var(--rsvp-border-radius)',
                              borderWidth: 'var(--rsvp-border-width)',
                              backgroundColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-color)',
                              color: isSelected
                                ? 'var(--rsvp-primary-btn-text-color)'
                                : 'var(--rsvp-secondary-btn-text-color)',
                              borderColor: isSelected
                                ? 'var(--rsvp-primary-btn-color)'
                                : 'var(--rsvp-secondary-btn-border-color)',
                            }}
                            onClick={() => {
                              const currentValue =
                                (formField.value as string[]) || [];
                              if (isSelected) {
                                formField.onChange(
                                  currentValue.filter(v => v !== opt.value)
                                );
                              } else {
                                formField.onChange([
                                  ...currentValue,
                                  opt.value,
                                ]);
                              }
                            }}
                          >
                            <CheckSquare2 className={cn('h-4 w-4')} />
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  ) : field.type === 'guest_count' ? (
                    <div>
                      {field.splitAdultChild ? (
                        <div className='flex items-center gap-3'>
                          {/* 大人 */}
                          <CounterControl
                            value={
                              (
                                formField.value as {
                                  adult: number;
                                }
                              )?.adult || 1
                            }
                            label='大人'
                            disabled={disabled}
                            onIncrement={() => {
                              const currentValue = formField.value as {
                                adult: number;
                              };
                              if (currentValue.adult > 0) {
                                formField.onChange({
                                  ...currentValue,
                                  adult: currentValue.adult + 1,
                                });
                              }
                            }}
                            onDecrement={() => {
                              const currentValue = formField.value as {
                                adult: number;
                              };
                              formField.onChange({
                                ...currentValue,
                                adult: (currentValue.adult || 0) - 1,
                              });
                            }}
                          />
                          {/* 小孩 */}
                          <CounterControl
                            value={
                              (
                                formField.value as {
                                  child: number;
                                }
                              )?.child || 0
                            }
                            label='小孩'
                            disabled={disabled}
                            onIncrement={() => {
                              const currentValue = formField.value as {
                                child: number;
                              };
                              formField.onChange({
                                ...currentValue,
                                child: (currentValue.child || 0) + 1,
                              });
                            }}
                            onDecrement={() => {
                              const currentValue = formField.value as {
                                child: number;
                              };
                              formField.onChange({
                                ...currentValue,
                                child: (currentValue.child || 0) - 1,
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <CounterControl
                          className='w-1/2'
                          value={
                            (
                              formField.value as {
                                total: number;
                              }
                            )?.total || 0
                          }
                          label='人数'
                          disabled={disabled}
                          onIncrement={() => {
                            const currentValue = (formField.value as {
                              total: number;
                            }) || { total: 0 };
                            formField.onChange({
                              ...currentValue,
                              total: (currentValue.total || 0) + 1,
                            });
                          }}
                          onDecrement={() => {
                            const currentValue = (formField.value as {
                              total: number;
                            }) || { total: 0 };
                            formField.onChange({
                              ...currentValue,
                              total: (currentValue.total || 0) - 1,
                            });
                          }}
                        />
                      )}
                    </div>
                  ) : null}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
    </div>
  );
}
