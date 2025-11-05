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
import { Minus, Plus } from 'lucide-react';
import { Control } from 'react-hook-form';
import { RSVPField } from '../type';

interface RSVPFormFieldsProps {
  fields: RSVPField[];
  control: Control<any>;
  className?: string;
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
    <div className={`space-y-6 ${className}`}>
      {fields
        .filter(field => field.enabled !== false)
        .map(field => (
          <FormField
            key={field.id}
            control={control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className='text-sm font-medium text-gray-900 mb-3'>
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
                      className='bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400'
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
                    <div className='space-y-2'>
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
                          <div className='flex-1 flex items-center gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                              onClick={() => {
                                const currentValue = (formField.value as {
                                  adult: number;
                                  child: number;
                                }) || { adult: 0, child: 0 };
                                const newAdult = Math.max(
                                  0,
                                  (currentValue.adult || 0) - 1
                                );
                                formField.onChange({
                                  ...currentValue,
                                  adult: newAdult,
                                });
                              }}
                            >
                              <Minus className='h-4 w-4' />
                            </Button>
                            <div className='flex-1 text-center'>
                              <span className='text-base font-semibold text-gray-900'>
                                {(
                                  formField.value as {
                                    adult: number;
                                    child: number;
                                  }
                                )?.adult || 0}
                              </span>
                              <span className='text-sm text-gray-500 ml-1'>
                                Adult
                              </span>
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                              onClick={() => {
                                const currentValue = (formField.value as {
                                  adult: number;
                                  child: number;
                                }) || { adult: 0, child: 0 };
                                formField.onChange({
                                  ...currentValue,
                                  adult: (currentValue.adult || 0) + 1,
                                });
                              }}
                            >
                              <Plus className='h-4 w-4' />
                            </Button>
                          </div>
                          {/* 小孩 */}
                          <div className='flex-1 flex items-center gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                              onClick={() => {
                                const currentValue = (formField.value as {
                                  adult: number;
                                  child: number;
                                }) || { adult: 0, child: 0 };
                                const newChild = Math.max(
                                  0,
                                  (currentValue.child || 0) - 1
                                );
                                formField.onChange({
                                  ...currentValue,
                                  child: newChild,
                                });
                              }}
                            >
                              <Minus className='h-4 w-4' />
                            </Button>
                            <div className='flex-1 text-center'>
                              <span className='text-base font-semibold text-gray-900'>
                                {(
                                  formField.value as {
                                    adult: number;
                                    child: number;
                                  }
                                )?.child || 0}
                              </span>
                              <span className='text-sm text-gray-500 ml-1'>
                                Child
                              </span>
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                              onClick={() => {
                                const currentValue = (formField.value as {
                                  adult: number;
                                  child: number;
                                }) || { adult: 0, child: 0 };
                                formField.onChange({
                                  ...currentValue,
                                  child: (currentValue.child || 0) + 1,
                                });
                              }}
                            >
                              <Plus className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2 w-1/2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                            onClick={() => {
                              const currentValue = (formField.value as {
                                total: number;
                              }) || { total: 0 };
                              const newTotal = Math.max(
                                0,
                                (currentValue.total || 0) - 1
                              );
                              formField.onChange({
                                total: newTotal,
                              });
                            }}
                          >
                            <Minus className='h-4 w-4' />
                          </Button>
                          <div className='flex-1 text-center'>
                            <span className='text-base font-semibold text-gray-900'>
                              {(formField.value as { total: number })?.total ||
                                0}
                            </span>
                            <span className='text-sm text-gray-500 ml-1'>
                              人
                            </span>
                          </div>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='h-9 w-9 shrink-0 rounded border-gray-300 bg-white'
                            onClick={() => {
                              const currentValue = (formField.value as {
                                total: number;
                              }) || { total: 0 };
                              formField.onChange({
                                total: (currentValue.total || 0) + 1,
                              });
                            }}
                          >
                            <Plus className='h-4 w-4' />
                          </Button>
                        </div>
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
