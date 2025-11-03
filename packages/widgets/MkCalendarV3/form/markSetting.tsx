import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';
import { MkCalendarV3Props } from '../shared/types';
import { DEFAULT_STYLE } from '../shared/utils';

interface Props {
  formControledValues: MkCalendarV3Props;
  onFormValueChange: any;
}
const MarkSetting = (props: Props) => {
  const { formControledValues, onFormValueChange } = props;
  const [mark1, setMark1] = useState(formControledValues?.mark1 || []);
  const [mark2, setMark2] = useState(formControledValues?.mark2 || []);
  return (
    <div className='p-4 flex flex-col gap-2 max-h-[70vh] overflow-y-auto'>
      <div className='text-sm'>已标记日期</div>
      {mark1?.map(item => (
        <div
          key={item.date}
          className='flex items-center gap-2 text-xs border rounded-lg p-2'
        >
          <div
            className='size-6 p-1 flex items-center justify-center'
            style={{
              color:
                formControledValues?.style?.mark1CornerTextColor ||
                DEFAULT_STYLE.mark1CornerTextColor,
              backgroundColor:
                formControledValues?.style?.mark1CornerBackgroundColor ||
                DEFAULT_STYLE.mark1CornerBackgroundColor,
              borderRadius:
                formControledValues?.style?.borderRadius ||
                DEFAULT_STYLE.borderRadius,
            }}
          >
            {item.cornerText}
          </div>
          <div className='flex-1'>
            <div className='text-black font-semibold'> {item.date}</div>
            <div className='text-gray-800'>放假</div>
          </div>
          <Button
            size='xs'
            variant='ghost'
            onClick={() => {
              const newValue = mark1?.filter(i => i.date !== item.date);
              setMark1(newValue);
              onFormValueChange({ mark1: newValue });
            }}
          >
            移除
          </Button>
        </div>
      ))}
      {mark2?.map(item => (
        <div
          key={item.date}
          className='flex items-center gap-2 text-xs border rounded-lg p-2'
        >
          <div
            className='size-6 p-1 flex items-center justify-center'
            style={{
              color:
                formControledValues?.style?.mark2CornerTextColor ||
                DEFAULT_STYLE.mark2CornerTextColor,
              backgroundColor:
                formControledValues?.style?.mark2CornerBackgroundColor ||
                DEFAULT_STYLE.mark2CornerBackgroundColor,
              borderRadius:
                formControledValues?.style?.borderRadius ||
                DEFAULT_STYLE.borderRadius,
            }}
          >
            {item.cornerText}
          </div>
          <div className='flex-1'>
            <div className='text-black font-semibold'> {item.date}</div>
            <div className='text-gray-800'>补班</div>
          </div>
          <Button
            size='xs'
            variant='ghost'
            onClick={() => {
              const newValue = mark2?.filter(i => i.date !== item.date);
              setMark2(newValue);
              onFormValueChange({ mark2: newValue });
            }}
          >
            移除
          </Button>
        </div>
      ))}

      <div className='p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground'>
        💡 上下滚动查看不同月份，点击日期即可标记
      </div>
    </div>
  );
};

export default MarkSetting;
