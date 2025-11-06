'use client';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Control } from 'react-hook-form';
import { RSVPField } from '../type';

interface RSVPFormFieldsProps {
  fields: RSVPField[];
  control: Control<any>;
  className?: string;
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
}

function CounterControl({
  className,
  value,
  label,
  onIncrement,
  onDecrement,
}: CounterControlProps) {
  return (
    <div className={cn('flex-1 flex items-center gap-2', className)}>
      <Button
        type='button'
        variant='outline'
        size='icon'
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
}: RSVPFormFieldsProps) {
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
                  className='text-xs font-medium text-gray-600'
                  style={{ lineHeight: '18px' }}
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
                      className='h-11 bg-gray-50 border-gray-100 rounded-lg focus:ring-0 focus:ring-gray-400 placeholder:text-gray-400'
                    />
                  ) : field.type === 'radio' ? (
                    <div className='flex flex-wrap items-center gap-3'>
                      {field.options?.map(opt => {
                        const isSelected = formField.value === opt.value;
                        const optionCount = field.options?.length || 0;
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={isSelected ? 'default' : 'outline'}
                            className={`${
                              optionCount === 2
                                ? 'flex-1'
                                : 'flex-1 min-w-[calc(50%-0.375rem)]'
                            } rounded-lg ${
                              isSelected
                                ? 'bg-gray-900 text-white hover:bg-gray-800'
                                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => formField.onChange(opt.value)}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className='space-y-1'>
                      {field.options?.map(opt => (
                        <div
                          key={opt.value}
                          className='flex items-center gap-2'
                        >
                          <Checkbox
                            id={`${field.id}-${opt.value}`}
                            checked={(formField.value as string[]).includes(
                              opt.value
                            )}
                            onCheckedChange={checked => {
                              const currentValue =
                                (formField.value as string[]) || [];
                              if (checked) {
                                formField.onChange([
                                  ...currentValue,
                                  opt.value,
                                ]);
                              } else {
                                formField.onChange(
                                  currentValue.filter(v => v !== opt.value)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`${field.id}-${opt.value}`}
                            className='text-sm cursor-pointer'
                          >
                            {opt.label}
                          </label>
                        </div>
                      ))}
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
