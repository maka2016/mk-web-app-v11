import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import cls from 'classnames';
import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import { ThemeConfigV2 } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { ColorItem } from './ColorItems';
import ColorPanel from './ColorPanel';
import CustomColorPanel2 from './CustomColorPanel2';
import GradienColorPanel2 from './GradienColorPanel2';
import {
  Color,
  ColorPickerChangeValue,
  ColorPickerProps,
  ThemeColorType,
} from './types';
import {
  baseColors,
  colorValueParser,
  createDefaultColor,
  normalizeColorValue,
} from './utils';

const ColorPicker: React.FC<ColorPickerProps> = props => {
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const themeConfig2 = gridProps.themeConfig2 || ({} as ThemeConfigV2);
  const { themeColors = [] } = themeConfig2 || {};

  const {
    value: _value,
    useThemeColor: _useThemeColor = true,
    disableGradient = false,
    disableAlpha = false,
    showRemoveButton = true,
    removeButtonText = '清除颜色',
    onRemove,
    onChange,
    wrapper,
    className,
  } = props;
  const useThemeColor = !!_useThemeColor;
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
      worksStore.setGridProps({
        themeConfig2: {
          ...themeConfig2,
          themeColors: resetThemeColors,
        },
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
    }
  }, [themeColors.length, themeConfig2]);

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

  // 处理清除颜色
  const handleRemove = () => {
    try {
      onRemove?.();
      onChange?.();
    } catch (error) {
      console.error('Color remove error:', error);
    }
  };

  // 默认触发器
  const defaultTrigger = (
    <div className='cursor-pointer'>
      <ColorItem
        color={colorForDisplay}
        isActive={false}
        onClick={() => {}} // 触发器不需要点击处理
      />
    </div>
  );

  // 使用自定义包装器或默认触发器
  const trigger = wrapper ? wrapper(defaultTrigger) : defaultTrigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side='right'
        align='center'
        className={`p-0 ${className || ''}`}
        style={{
          width: 286,
        }}
      >
        <div className={cls('color-picker-container', className)}>
          <Tabs
            className={cls(
              'color_picker_content h-[420px] flex flex-col p-2 overflow-hidden'
            )}
          >
            <TabsList className='flex w-full'>
              {useThemeColor && (
                <TabsTrigger value='themeColor' className='flex-1'>
                  主题色
                </TabsTrigger>
              )}
              <TabsTrigger value='normal' className='flex-1'>
                自定义
              </TabsTrigger>
              {!disableGradient && (
                <TabsTrigger value='gradient' className='flex-1'>
                  渐变
                </TabsTrigger>
              )}
            </TabsList>

            <div className='content flex-1 overflow-y-auto'>
              {useThemeColor && (
                <TabsContent value='themeColor'>
                  <ColorPanel
                    value={_value}
                    onChange={handleColorChange}
                    disableGradient={disableGradient}
                    disableAlpha={disableAlpha}
                  />
                </TabsContent>
              )}
              <TabsContent value='normal'>
                <CustomColorPanel2
                  disableAlpha={disableAlpha}
                  color={normalizedValue}
                  onChange={colorCode => {
                    try {
                      const rgb = colorCode.rgb || { r: 0, g: 0, b: 0, a: 1 };
                      const alpha = rgb.a ?? 1;
                      const changeValue: ColorPickerChangeValue = {
                        colors: null,
                        type: 'color',
                        hex: colorCode.hex || '#000000',
                        rgb: {
                          r: rgb.r || 0,
                          g: rgb.g || 0,
                          b: rgb.b || 0,
                          a: alpha,
                        },
                        value: colorCode.hex,
                        valueRgba: `rgba(${rgb.r || 0},${rgb.g || 0},${rgb.b || 0},${alpha})`,
                      };
                      handleColorChange(changeValue);
                    } catch (error) {
                      console.error('Error processing custom color:', error);
                    }
                  }}
                />
              </TabsContent>

              {!disableGradient && (
                <TabsContent value='gradient'>
                  <GradienColorPanel2
                    immediateChange={false}
                    value={normalizedValue}
                    onChange={(gradient: string) => {
                      try {
                        const changeValue: ColorPickerChangeValue = {
                          colors: null,
                          type: 'gradient',
                          hex: '#000000',
                          value: gradient,
                        };
                        handleColorChange(changeValue);
                      } catch (error) {
                        console.error(
                          'Error processing gradient color:',
                          error
                        );
                      }
                    }}
                  />
                </TabsContent>
              )}
            </div>
          </Tabs>

          {showRemoveButton && (
            <div className='p-2 border-t'>
              <Button
                variant='outline'
                onClick={handleRemove}
                className='w-full'
              >
                {removeButtonText}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default observer(ColorPicker);
