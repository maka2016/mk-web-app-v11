import { hex2Rgb } from '@/utils';
import { Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Color } from './types';

export default function EyeDropperPickerButton({
  onChange,
}: {
  onChange: (color: Color) => void;
}) {
  const [isSupportEyeDropper, setIsSupportEyeDropper] = useState(false);

  // 检查浏览器是否支持取色器
  useEffect(() => {
    try {
      setIsSupportEyeDropper(!!window.EyeDropper);
    } catch (error) {
      console.warn('Failed to check EyeDropper support:', error);
      setIsSupportEyeDropper(false);
    }
  }, []);

  // 处理取色器功能
  const handleClipColor = () => {
    if (!isSupportEyeDropper) {
      console.warn('EyeDropper not supported');
      return;
    }

    try {
      const eyeDropper = new window.EyeDropper();
      eyeDropper
        .open()
        .then(res => {
          const { sRGBHex } = res;
          if (!sRGBHex) {
            console.warn('No color selected from EyeDropper');
            return;
          }

          try {
            const rgbObj = hex2Rgb(sRGBHex);
            const { rgb } = rgbObj;

            const color: Color = {
              hex: sRGBHex,
              rgb,
              type: 'color',
              value: sRGBHex,
              elementId: '',
              elementRef: 'EyeDropper',
              colorType: 'preset',
            };

            onChange(color);
          } catch (error) {
            console.error('Failed to process EyeDropper color:', error);
          }
        })
        .catch(err => {
          // 用户取消取色不算错误
          if (err.name !== 'AbortError') {
            console.warn('EyeDropper error:', err);
          }
        });
    } catch (error) {
      console.error('Failed to create EyeDropper:', error);
    }
  };

  if (!isSupportEyeDropper) {
    return null;
  }

  return (
    <button
      className='p-1 hover:bg-gray-100 rounded transition-colors flex items-center gap-1 text-xs'
      onClick={handleClipColor}
      title='取色器'
      type='button'
    >
      <Edit2 size={14} className='text-gray-600' />
      拾色器
    </button>
  );
}
