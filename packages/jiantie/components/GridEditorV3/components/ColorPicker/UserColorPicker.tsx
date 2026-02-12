import { hex2Rgb } from '@/utils';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import chroma from 'chroma-js';
import cls from 'classnames';
import { Palette } from 'lucide-react';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { ThemeConfigV2 } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { ColorItem } from './ColorItems';
import ColorPanel from './ColorPanel';
import CustomColorPanel2 from './CustomColorPanel2';
import { Color, ColorPickerChangeValue } from './types';
import {
  colorValueParser,
  createDefaultColor,
  normalizeColorValue
} from './utils';

const UserColorPickerContainer = styled.div`
  padding: 12px 16px;
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

const ColorPaletteGrid = styled.div``;

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
      showOverlay={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
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

// 使用 chroma 生成颜色分支
// 为每种基础颜色生成9个从浅到深的分支
const generateColorScale = (baseColor: string, steps: number = 9): string[] => {
  // 从很浅的颜色到基础颜色再到深色，生成均匀分布的颜色
  const lightColor = chroma(baseColor).brighten(3).saturate(0.3);
  const darkColor = chroma(baseColor).darken(2).saturate(0.2);
  const scale = chroma.scale([lightColor, baseColor, darkColor]).mode('lab');

  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1); // 0 到 1 的均匀分布
    return scale(t).hex();
  });
};

// 固定的纯色色板 - 5种常用颜色及其拓展（每种颜色9个分支）
const PRESET_COLORS = [
  // 第一行：红色系 (从浅到深)
  generateColorScale('#FF0000', 9),
  // 第二行：蓝色系 (从浅到深)
  generateColorScale('#0066FF', 9),
  // 第三行：绿色系 (从浅到深)
  generateColorScale('#00BF00', 9),
  // 第四行：黄色系 (从浅到深)
  generateColorScale('#FFD700', 9),
  // 第五行：灰度系 (从白到黑)
  generateColorScale('#808080', 9),
];

function UserColorPicker(props: {
  wrapper?: (defaultTrigger: React.ReactNode, colorForDisplay: Color) => any;
  value: string;
  onChange: (value: ColorPickerChangeValue) => void;
}) {
  const { wrapper, value: _value, onChange } = props;
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const themeConfig2 = gridProps.themeConfig2 || ({} as ThemeConfigV2);
  const { themeColors = [] } = themeConfig2;
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);

  const value = colorValueParser(_value, themeColors);

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
      onClick={() => { }} // 触发器不需要点击处理
    />
  );

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          {wrapper ? wrapper(defaultTrigger, colorForDisplay) : defaultTrigger}
        </PopoverTrigger>
        <PopoverContent
          side='top'
          className='p-0 shadow-none rounded-b-none w-screen md:w-[400px]'
        >
          <UserColorPickerContainer
            className={cls('color-picker-container gap-4 flex flex-col')}
          >
            {/* 主题颜色 */}
            {/* <ColorPaletteSection>
                <ColorPaletteTitle>主题颜色</ColorPaletteTitle>
                <ColorPanel
                  value={_value}
                  needHelper={false}
                  onChange={handleColorChange}
                  itemStyle={{
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                  }}
                />
              </ColorPaletteSection> */}

            {/* 纯色色板 */}
            <ColorPaletteSection className=''>
              {/* <ColorPaletteTitle>纯色</ColorPaletteTitle> */}
              <div className='overflow-x-auto py-1 w-full flex md:flex-col gap-2 '>
                <ColorPaletteGrid className='flex md:flex-wrap flex-nowrap w-fit gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setIsCustomColorOpen(true);
                    }}
                    className='flex shrink-0 items-center justify-center w-8 aspect-square rounded-full border border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)]'
                    aria-label='选择自定义颜色'
                  >
                    <Palette className='w-4 h-4 text-gray-500' />
                  </button>
                  <ColorPanel
                    wrapper={children => {
                      return children;
                    }}
                    value={_value}
                    needHelper={false}
                    onChange={handleColorChange}
                    itemStyle={{
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                    }}
                  />
                </ColorPaletteGrid>
                <ColorPaletteGrid className='flex md:flex-wrap flex-nowrap w-fit gap-2'>
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
                          width: '32px',
                          height: 'auto',
                          aspectRatio: '1',
                          borderRadius: '50%',
                        }}
                      />
                    );
                  })}
                </ColorPaletteGrid>
              </div>
            </ColorPaletteSection>

            {/* 自定义颜色 */}
            {/* <ColorPaletteSection>
                <ColorPaletteTitle>自定义颜色</ColorPaletteTitle>
                <Button
                  variant='outline'
                  onClick={() => setIsCustomColorOpen(true)}
                  className='w-full'
                >
                  点击选择自定义颜色
                </Button>
              </ColorPaletteSection> */}
          </UserColorPickerContainer>
        </PopoverContent>
      </Popover>

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

export default observer(UserColorPicker);
