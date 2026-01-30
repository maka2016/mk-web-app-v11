'use client';

import { Button } from '@workspace/ui/components/button';
import { Calendar } from '@workspace/ui/components/calendar';
import { Label } from '@workspace/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { formatDateRange } from 'little-date';
import { ChevronDownIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  label?: string;
  id?: string;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  label = '创建日期',
  id = 'date-range',
  placeholder = '选择日期范围',
}: DateRangePickerProps) {
  return (
    <div className='flex items-center gap-2'>
      <Label
        htmlFor={id}
        className='text-sm font-medium whitespace-nowrap min-w-[60px]'
      >
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            id={id}
            className='flex-1 justify-between font-normal h-9'
          >
            {value?.from && value?.to
              ? formatDateRange(value.from, value.to, {
                  includeTime: false,
                })
              : placeholder}
            <ChevronDownIcon className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='range'
            selected={value}
            captionLayout='dropdown'
            onSelect={onChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
