import { hex2Rgb } from '@/utils';
import styled from '@emotion/styled';
import cls from 'classnames';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { ThemeConfigV2 } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { ColorItems } from './ColorItems';
import CustomColorPanel2 from './CustomColorPanel2';
import GradienColorPanel2 from './GradienColorPanel2';
import {
  Color,
  ColorPanelProps,
  ColorPickerChangeValue,
  ThemeColorType,
} from './types';
import {
  createColorChangeValue,
  createDefaultColor,
  isValidRGB,
  normalizeColorValue,
  parseValueToColor,
} from './utils';

const ColorPanelContainer = styled.div`
  padding: 8px 0;
  user-select: none;
  * {
    user-select: none;
  }
`;

const ColorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const ColorPanel: React.FC<
  ColorPanelProps & {
    itemStyle?: React.CSSProperties;
    needHelper?: boolean;
    wrapper?: (children: React.ReactNode) => React.ReactNode;
  }
> = props => {
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const themeConfig2 = gridProps.themeConfig2 || ({} as ThemeConfigV2);
  const { themeColors = [] } = themeConfig2;
  const {
    value = '#000000',
    onChange,
    className,
    itemStyle,
    needHelper = true,
    wrapper,
  } = props;
  const [useGradiant, setUseGradiant] = useState(false);

  // 解析输入值并转换为Color对象
  const [selectedColor, setSelectedColor] = useState<Color>(() => {
    return parseValueToColor(value, themeColors);
  });

  // 当外部value变化时更新内部状态
  useEffect(() => {
    const newColor = parseValueToColor(value, themeColors);
    setSelectedColor(newColor);
  }, [value, JSON.stringify(themeColors)]);

  // 处理颜色变更
  const handleColorChange = (color: Color) => {
    try {
      // 验证颜色对象
      if (!color || (!color.rgb && !color.hex)) {
        console.warn('Invalid color object:', color);
        return;
      }

      // 确保有有效的RGB值
      let rgb = color.rgb;
      if (!rgb && color.hex) {
        try {
          const hexResult = hex2Rgb(color.hex);
          rgb = hexResult.rgb;
        } catch (error) {
          console.error('Failed to convert hex to rgb:', error);
          rgb = { r: 0, g: 0, b: 0, a: 1 };
        }
      }

      // 验证RGB值
      if (!isValidRGB(rgb)) {
        console.warn('Invalid RGB values:', rgb);
        rgb = { r: 0, g: 0, b: 0, a: 1 };
      }

      // 创建颜色变更值
      const changeValue: ColorPickerChangeValue = createColorChangeValue(
        {
          ...color,
          rgb,
        },
        rgb
      );

      // 更新内部状态
      setSelectedColor({
        ...color,
        rgb,
      });

      // 调用外部回调
      onChange?.(changeValue);
    } catch (error) {
      console.error('Error handling color change:', error);
    }
  };

  // 处理清除颜色
  const handleClearColor = () => {
    try {
      const clearColor: Color = createDefaultColor('#000000');
      handleColorChange(clearColor);
    } catch (error) {
      console.error('Failed to clear color:', error);
    }
  };

  const updateThemeConfig = (updates: { themeColors: any[] }) => {
    worksStore.setGridProps({
      themeConfig2: {
        ...(themeConfig2 || {}),
        ...updates,
      },
    });
  };

  const updateCustomColor = (id: string, updates: Partial<ThemeColorType>) => {
    const updatedColors = themeColors.map(color =>
      color.colorId === id ? { ...color, ...updates } : color
    );
    updateThemeConfig({ themeColors: updatedColors });
  };

  // 将主题颜色转换为Color格式
  const themeColorList = themeColors
    .map(themeColor => {
      try {
        const normalizedValue = normalizeColorValue(themeColor.value);
        if (!normalizedValue) {
          return undefined;
        }
        const rgb = hex2Rgb(normalizedValue).rgb;

        return {
          colorRefId: themeColor.colorId,
          colors: null,
          type: themeColor.type,
          hex: normalizedValue,
          rgb,
          value: normalizedValue,
          elementId: themeColor.colorId,
          elementRef: 'ThemeColor',
          colorType: 'theme',
          name: themeColor.name,
        } as Color;
      } catch (error) {
        console.warn('Failed to process theme color:', themeColor, error);
        return createDefaultColor(themeColor.value);
      }
    })
    .filter(color => color !== undefined);

  if (wrapper) {
    return wrapper(
      <ColorItems
        colorList={themeColorList}
        selectedColor={selectedColor}
        onClick={handleColorChange}
        itemStyle={itemStyle}
      />
    );
  }

  return (
    <ColorPanelContainer className={cls(className)}>
      <div className='flex items-center gap-2 flex-wrap'>
        {themeColorList.length > 0 && (
          <ColorItems
            colorList={themeColorList}
            selectedColor={selectedColor}
            onClick={handleColorChange}
            itemStyle={itemStyle}
          />
        )}

        {needHelper && selectedColor.colorRefId && (
          <div
            className='text-xs cursor-pointer ml-auto'
            onClick={() => setUseGradiant(!useGradiant)}
            title='渐变切换'
          >
            {useGradiant ? '纯色' : '渐变'}
          </div>
        )}
      </div>
      {needHelper && (
        <>
          {selectedColor.colorRefId && (
            <>
              {useGradiant ? (
                <GradienColorPanel2
                  immediateChange={false}
                  value={selectedColor.value}
                  onChange={(gradient: string) => {
                    try {
                      const changeValue: ColorPickerChangeValue = {
                        colors: null,
                        type: 'gradient',
                        hex: '#000000',
                        value: gradient,
                      };
                      if (selectedColor.colorRefId) {
                        updateCustomColor(selectedColor.colorRefId, {
                          value: changeValue.value,
                        });
                      }
                    } catch (error) {
                      console.error('Error processing gradient color:', error);
                    }
                  }}
                />
              ) : (
                <CustomColorPanel2
                  color={selectedColor.value}
                  onChange={colorCode => {
                    if (selectedColor.colorRefId) {
                      updateCustomColor(selectedColor.colorRefId, {
                        value: colorCode.hex,
                      });
                    }
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </ColorPanelContainer>
  );
};

export default observer(ColorPanel);
