'use client';
import styled from '@emotion/styled';
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

export const InputWithTheme = styled(Input)`
  font-size: var(--rsvp-control-font-size);
  padding-top: var(--rsvp-control-padding);
  padding-bottom: var(--rsvp-control-padding);
  padding-left: calc(var(--rsvp-control-padding) * 1.5);
  padding-right: calc(var(--rsvp-control-padding) * 1.5);
  border-radius: var(--rsvp-border-radius);
  border-width: var(--rsvp-border-width);
  border-style: solid;
  background-color: var(--rsvp-input-bg-color);
  border-color: var(--rsvp-input-border-color);
  color: var(--rsvp-input-text-color);
  ::placeholder {
    color: var(--rsvp-input-placeholder-color);
    font-size: var(--rsvp-control-font-size);
  }
`;

export const ButtonWithTheme = styled(Button)`
  font-size: var(--rsvp-control-font-size);
  padding-top: var(--rsvp-control-padding);
  padding-bottom: var(--rsvp-control-padding);
  padding-left: calc(var(--rsvp-control-padding) * 1.25);
  padding-right: calc(var(--rsvp-control-padding) * 1.25);
  line-height: calc(var(--rsvp-control-font-size) * 1.2);
  border-radius: var(--rsvp-border-radius);
  border-width: var(--rsvp-border-width);
  border-style: solid;
  background-color: var(--rsvp-secondary-btn-color);
  border-color: var(--rsvp-secondary-btn-border-color);
`;

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
        className='h-8 w-8 shrink-0'
        style={{
          borderRadius: 'var(--rsvp-border-radius)',
          borderWidth: 'var(--rsvp-border-width)',
          borderStyle: 'solid',
          backgroundColor: 'var(--rsvp-secondary-btn-color)',
          borderColor: 'var(--rsvp-secondary-btn-border-color)',
          color: 'var(--rsvp-secondary-btn-text-color)',
        }}
        onClick={onDecrement}
      >
        <Minus className='h-4 w-4' />
      </Button>
      <div className='flex-1 text-center'>
        <span
          className='text-base font-semibold'
          style={{
            color: 'var(--rsvp-label-color)',
          }}
        >
          {value}
        </span>
        <span
          className='text-sm ml-1'
          style={{
            color: 'var(--rsvp-label-color)',
          }}
        >
          {label}
        </span>
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled}
        className='h-8 w-8 shrink-0'
        style={{
          borderRadius: 'var(--rsvp-border-radius)',
          borderWidth: 'var(--rsvp-border-width)',
          borderStyle: 'solid',
          backgroundColor: 'var(--rsvp-secondary-btn-color)',
          borderColor: 'var(--rsvp-secondary-btn-border-color)',
          color: 'var(--rsvp-secondary-btn-text-color)',
        }}
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
                  className='font-medium'
                  style={{
                    lineHeight: '1.5',
                    color: 'var(--rsvp-label-color)',
                    fontSize: 'var(--rsvp-control-font-size)',
                  }}
                >
                  {field.label === '访客' ? '出席人数（含本人）' : field.label}
                  {field.required ? (
                    <span className='text-red-500 ml-1'>*</span>
                  ) : null}
                </FormLabel>
                <FormControl>
                  {field.type === 'text' ? (
                    <InputWithTheme
                      placeholder={field.placeholder || '请输入' + field.label}
                      value={formField.value as string}
                      onChange={formField.onChange}
                      onBlur={formField.onBlur}
                      name={formField.name}
                      ref={formField.ref}
                      disabled={disabled}
                      className='focus:ring-0 [&::placeholder]:text-[var(--rsvp-input-placeholder-color)]'
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
                              borderStyle: 'solid',
                              fontSize: 'var(--rsvp-control-font-size)',
                              paddingTop: 'var(--rsvp-control-padding)',
                              paddingBottom: 'var(--rsvp-control-padding)',
                              paddingLeft:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              paddingRight:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              lineHeight:
                                'calc(var(--rsvp-control-font-size) * 1.2)',
                            }}
                            onClick={() => formField.onChange(opt.value)}
                          >
                            <Circle
                              className={cn(
                                'shrink-0',
                                isSelected ? 'fill-current' : ''
                              )}
                              style={{
                                width:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                                height:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                              }}
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
                              borderStyle: 'solid',
                              fontSize: 'var(--rsvp-control-font-size)',
                              paddingTop: 'var(--rsvp-control-padding)',
                              paddingBottom: 'var(--rsvp-control-padding)',
                              paddingLeft:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              paddingRight:
                                'calc(var(--rsvp-control-padding) * 1.25)',
                              lineHeight:
                                'calc(var(--rsvp-control-font-size) * 1.2)',
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
                            <CheckSquare2
                              className='shrink-0'
                              style={{
                                width:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                                height:
                                  'calc(var(--rsvp-control-font-size) * 0.95)',
                              }}
                            />
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
