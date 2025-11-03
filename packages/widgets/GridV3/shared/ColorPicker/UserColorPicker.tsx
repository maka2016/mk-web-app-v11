import styled from '@emotion/styled';
import { hex2Rgb } from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { useGridContext } from '../../comp/provider';
import { ColorItem } from './ColorItems';
import ColorPanel from './ColorPanel';
import CustomColorPanel2 from './CustomColorPanel2';
import { Color, ColorPickerChangeValue, ThemeColorType } from './types';
import {
  baseColors,
  colorValueParser,
  createDefaultColor,
  normalizeColorValue,
} from './utils';

const UserColorPickerContainer = styled.div`
  padding: 12px 16px 48px;
  user-select: none;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const ColorPaletteSection = styled.div`
  width: 100%;
`;

const ColorPaletteTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
`;

const ColorPaletteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
  width: 100%;

  @media (max-width: 640px) {
    gap: 6px;
  }
`;

const CustomColorPickerContent = styled.div`
  padding: 12px 16px 24px;
`;

// 自定义颜色选择器组件
const CustomColorPicker: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialColor?: string;
  onConfirm: (color: string) => void;
}> = ({ isOpen, onOpenChange, initialColor = '#000000', onConfirm }) => {
  const [customColor, setCustomColor] = useState(initialColor);

  useEffect(() => {
    if (isOpen) {
      setCustomColor(initialColor);
    }
  }, [isOpen, initialColor]);

  const handleConfirm = () => {
    onConfirm(customColor);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      title='自定义颜色'
      showOverlay={true}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showCloseIcon={false}
    >
      <CustomColorPickerContent>
        <CustomColorPanel2
          color={customColor}
          onChange={color => {
            setCustomColor(color.hex);
          }}
          disableAlpha={true}
        />
        <Button onClick={handleConfirm} className='w-full mt-4'>
          确认
        </Button>
      </CustomColorPickerContent>
    </ResponsiveDialog>
  );
};

// 固定的纯色色板 - 5种常用颜色及其拓展
const PRESET_COLORS = [
  // 第一行：红色系 (从浅到深)
  [
    '#FFE5E5',
    '#FFCCCC',
    '#FF9999',
    '#FF6666',
    '#FF3333',
    '#FF0000',
    '#CC0000',
    '#990000',
    '#660000',
    '#330000',
  ],
  // 第二行：蓝色系 (从浅到深)
  [
    '#E5F0FF',
    '#CCE0FF',
    '#99C2FF',
    '#66A3FF',
    '#3385FF',
    '#0066FF',
    '#0052CC',
    '#003D99',
    '#002966',
    '#001433',
  ],
  // 第三行：绿色系 (从浅到深)
  [
    '#E5F9E5',
    '#CCF2CC',
    '#99E699',
    '#66D966',
    '#33CC33',
    '#00BF00',
    '#009900',
    '#007300',
    '#004D00',
    '#002600',
  ],
  // 第四行：黄色系 (从浅到深)
  [
    '#FFFBE5',
    '#FFF7CC',
    '#FFEF99',
    '#FFE766',
    '#FFDF33',
    '#FFD700',
    '#CCAC00',
    '#998100',
    '#665600',
    '#332B00',
  ],
  // 第五行：灰度系 (从白到黑)
  [
    '#FFFFFF',
    '#F2F2F2',
    '#E6E6E6',
    '#CCCCCC',
    '#B3B3B3',
    '#999999',
    '#808080',
    '#666666',
    '#4D4D4D',
    '#000000',
  ],
];

export default function UserColorPicker(props: {
  wrapper?: (defaultTrigger: React.ReactNode) => any;
  value: string;
  onChange: (value: ColorPickerChangeValue) => void;
}) {
  const { wrapper, value: _value, onChange } = props;
  const { themeConfig, editorSDK } = useGridContext();
  const { themeColors = [] } = themeConfig;
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);

  const value = colorValueParser(_value, themeColors);

  useEffect(() => {
    if (
      themeColors.length === 0 ||
      themeColors[0].colorId !== 'color_ref_id_0'
    ) {
      // 需要稳定的id，不要使用random，因为需要切换不同的主题颜色时，id不能变化
      // 如果新增，需要严格按照顺序实现
      const resetThemeColors = [] as ThemeColorType[];
      baseColors.forEach((color, index) => {
        let name = `自定义颜色 ${index + 1}`;
        if (index === 0) {
          name = '主题颜色';
        }
        resetThemeColors.push({
          colorId: `color_ref_id_${index}`,
          tag: 'custom' as const,
          type: 'color' as const,
          name: name,
          value: color,
        });
      });
      editorSDK?.onFormValueChange({
        themeConfig2: {
          ...themeConfig,
          themeColors: resetThemeColors,
        },
      });
    }
  }, [themeColors.length, themeColors, editorSDK, themeConfig]);

  // 标准化颜色值
  const normalizedValue = normalizeColorValue(value);

  // 创建颜色对象用于显示
  const colorForDisplay: Color = createDefaultColor(normalizedValue);

  // 处理颜色变更
  const handleColorChange = (changeValue: ColorPickerChangeValue) => {
    try {
      onChange?.({
        ...changeValue,
      });
    } catch (error) {
      console.error('Color change error:', error);
    }
  };

  // 处理预设颜色点击
  const handlePresetColorClick = (hexColor: string) => {
    try {
      const rgb = hex2Rgb(hexColor).rgb;

      const changeValue: ColorPickerChangeValue = {
        colors: null,
        type: 'color',
        hex: hexColor,
        rgb,
        value: hexColor,
      };

      handleColorChange(changeValue);
      setIsOpen(false); // 选择颜色后关闭弹窗
    } catch (error) {
      console.error('Preset color click error:', error);
    }
  };

  // 确认自定义颜色
  const handleConfirmCustomColor = (hexColor: string) => {
    try {
      const rgb = hex2Rgb(hexColor).rgb;

      const changeValue: ColorPickerChangeValue = {
        colors: null,
        type: 'color',
        hex: hexColor,
        rgb,
        value: hexColor,
      };

      handleColorChange(changeValue);
      setIsOpen(false); // 确认后关闭主弹窗
    } catch (error) {
      console.error('Custom color confirm error:', error);
    }
  };

  // 默认触发器
  const defaultTrigger = (
    <ColorItem
      color={colorForDisplay}
      isActive={false}
      onClick={() => {}} // 触发器不需要点击处理
    />
  );

  return (
    <>
      <div className='cursor-pointer' onClick={() => setIsOpen(true)}>
        {wrapper ? wrapper(defaultTrigger) : defaultTrigger}
      </div>
      <ResponsiveDialog
        title='换颜色'
        showOverlay={false}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <UserColorPickerContainer
          className={cls('color-picker-container gap-4 flex flex-col')}
        >
          {/* 主题颜色 */}
          <ColorPaletteSection>
            <ColorPaletteTitle>主题颜色</ColorPaletteTitle>
            <ColorPanel
              value={_value}
              needHelper={false}
              onChange={handleColorChange}
              itemStyle={{
                width: 'clamp(32px, 10vw, 38px)',
                height: 'clamp(32px, 10vw, 38px)',
              }}
            />
          </ColorPaletteSection>

          {/* 纯色色板 */}
          <ColorPaletteSection>
            <ColorPaletteTitle>纯色</ColorPaletteTitle>
            <ColorPaletteGrid>
              {PRESET_COLORS.flat().map((hexColor, index) => {
                const rgb = hex2Rgb(hexColor).rgb;
                const color: Color = {
                  hex: hexColor,
                  rgb,
                  type: 'color',
                  value: hexColor,
                  elementId: `preset-${index}`,
                  elementRef: 'ColorPicker',
                  colorType: 'preset',
                };

                const isActive = normalizedValue === hexColor;

                return (
                  <ColorItem
                    key={`preset-${index}-${hexColor}`}
                    color={color}
                    isActive={isActive}
                    onClick={() => handlePresetColorClick(hexColor)}
                    itemStyle={{
                      width: '100%',
                      height: 'auto',
                      aspectRatio: '1',
                      borderRadius: '50%',
                    }}
                  />
                );
              })}
            </ColorPaletteGrid>
          </ColorPaletteSection>

          {/* 自定义颜色 */}
          <ColorPaletteSection>
            <ColorPaletteTitle>自定义颜色</ColorPaletteTitle>
            <Button
              variant='outline'
              onClick={() => setIsCustomColorOpen(true)}
              className='w-full'
            >
              点击选择自定义颜色
            </Button>
          </ColorPaletteSection>
        </UserColorPickerContainer>
      </ResponsiveDialog>

      {/* 自定义颜色选择器弹窗 */}
      <CustomColorPicker
        isOpen={isCustomColorOpen}
        onOpenChange={setIsCustomColorOpen}
        initialColor={normalizedValue || '#000000'}
        onConfirm={handleConfirmCustomColor}
      />
    </>
  );
}
