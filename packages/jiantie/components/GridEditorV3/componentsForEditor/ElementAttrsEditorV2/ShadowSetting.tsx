import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import { useMemo } from 'react';
import ColorPickerPopover from '../../components/ColorPicker';
import { colorValueBuilder } from '../../components/ColorPicker/utils';

export interface ShadowItem {
  x: number;
  y: number;
  blur: number;
  spread?: number; // box-shadow 特有的 spread 属性
  color: string;
}

export type ShadowType = 'text-shadow' | 'drop-shadow' | 'box-shadow';

interface ShadowSettingProps {
  title?: string;
  showPresets?: boolean;
  shadowType?: ShadowType;
  cssValue?: string;
  onCssChange?: (cssValue: string) => void;
}

/**
 * 颜色标准化（统一为十六进制）
 * @param colorStr - 原始颜色字符串
 * @returns 标准十六进制颜色（如 #558abb）
 */
function normalizeColor(colorStr: string): string {
  // 输入验证
  if (!colorStr || typeof colorStr !== 'string') {
    return '#000000';
  }

  // 处理关键字颜色
  const colorMap: Record<string, string> = {
    red: '#ff0000',
    blue: '#0000ff',
    green: '#00ff00',
    black: '#000000',
    white: '#ffffff',
    purple: '#800080',
  };
  if (colorMap[colorStr.toLowerCase()]) {
    return colorMap[colorStr.toLowerCase()];
  }

  // 处理RGB/RGBA（如 rgb(85,138,187)）
  const rgbMatch = colorStr.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?$/i
  );
  if (rgbMatch) {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(Number(rgbMatch[1]))}${toHex(Number(rgbMatch[2]))}${toHex(Number(rgbMatch[3]))}`;
  }

  // 简写HEX转完整（如 #abc → #aabbcc）
  if (/^#[\da-f]{3}$/i.test(colorStr)) {
    return `#${colorStr[1]}${colorStr[1]}${colorStr[2]}${colorStr[2]}${colorStr[3]}${colorStr[3]}`;
  }

  // 如果输入的是有效的十六进制颜色，返回小写格式
  if (/^#[0-9a-f]{6}$/i.test(colorStr)) {
    return colorStr.toLowerCase();
  }

  // 默认返回黑色
  return '#000000';
}

/**
 * 解析阴影字符串为结构化数据
 * @param shadowStr - CSS 阴影字符串
 * @param shadowType - 阴影类型
 * @returns 包含 x/y/blur/spread/color 的对象数组
 */
function parseShadow(
  shadowStr: string,
  shadowType: ShadowType = 'text-shadow'
): ShadowItem[] {
  if (!shadowStr.trim()) return [];

  // 拆分多层阴影（兼容逗号分隔）
  const shadows = shadowStr.split(/\s*,\s*/);
  const result = [];

  for (const shadow of shadows) {
    // 提取数值和颜色（兼容颜色值在任意位置）
    const parts = shadow
      .trim()
      .match(/(-?[\d.]+(?:px)?)|(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[\w]+)/g);
    if (!parts || parts.length < 2) continue;

    // 分离数值和颜色
    const values: number[] = [];
    let color = '';

    for (const part of parts) {
      if (part.match(/^(-?[\d.]+)px?$/)) {
        values.push(parseFloat(part)); // 提取数值（兼容带px单位或不带）
      } else if (part.match(/^#|rgba?\(|^[a-z]+$/i)) {
        // 保持原始颜色格式，特别是 rgba 格式
        if (part.startsWith('rgba(') || part.startsWith('rgb(')) {
          color = part; // 直接使用 rgba/rgb 格式
        } else {
          color = normalizeColor(part); // 其他格式标准化
        }
      }
    }

    // 验证必要参数
    if (values.length < 2 || !color) continue;

    // 根据阴影类型处理参数
    let shadowItem: ShadowItem;

    if (shadowType === 'box-shadow') {
      // box-shadow: x y blur spread color
      const [x, y, blur = 0, spread = 0] = values;
      shadowItem = { x, y, blur, spread, color };
    } else {
      // text-shadow 和 drop-shadow: x y blur color
      const [x, y, blur = 0] = values;
      shadowItem = { x, y, blur, color };
    }

    result.push(shadowItem);
  }

  return result;
}

/**
 * 将结构化阴影数组转换为CSS阴影字符串
 * @param shadows - parseShadow解析后的阴影数组
 * @param shadowType - 阴影类型
 * @returns 符合CSS规范的阴影字符串
 */
function formatShadow(
  shadows: ShadowItem[],
  shadowType: ShadowType = 'text-shadow'
): string {
  return shadows
    .map(shadow => {
      const { x, y, blur = 0, spread, color } = shadow;

      // 确保颜色格式正确，支持 rgba 格式
      let formattedColor = color;

      // 如果是十六进制格式但需要保持透明度，检查是否有透明度信息
      if (color.startsWith('#') && color.length === 9) {
        // 8位十六进制包含透明度，转换为 rgba 格式
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const a = parseInt(color.slice(7, 9), 16) / 255;
        formattedColor = `rgba(${r}, ${g}, ${b}, ${a})`;
      } else if (color.startsWith('#') && color.length === 7) {
        // 6位十六进制，保持原格式
        formattedColor = color;
      } else if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
        // 已经是 rgb/rgba 格式，保持原格式
        formattedColor = color;
      } else {
        // 其他格式，尝试标准化
        formattedColor = normalizeColor(color);
      }

      if (shadowType === 'box-shadow') {
        // box-shadow: x y blur spread color
        return `${x}px ${y}px ${blur}px ${spread || 0}px ${formattedColor}`;
      } else {
        // text-shadow 和 drop-shadow: x y blur color
        return blur === 0
          ? `${x}px ${y}px ${formattedColor}`
          : `${x}px ${y}px ${blur}px ${formattedColor}`;
      }
    })
    .join(', '); // 多层阴影用逗号分隔
}

const ShadowSetting = ({
  title = '阴影设置',
  showPresets = true,
  shadowType = 'text-shadow',
  cssValue,
  onCssChange,
}: ShadowSettingProps) => {
  // 解析CSS值为内部状态
  const shadows = useMemo(() => {
    return cssValue ? parseShadow(cssValue, shadowType) : [];
  }, [cssValue, shadowType]);

  const handleShadowsChange = (newShadows: ShadowItem[]) => {
    if (onCssChange) {
      const cssString = formatShadow(newShadows, shadowType);
      onCssChange(cssString);
    }
  };

  const handleAddShadow = () => {
    const newShadows = [
      ...shadows,
      {
        x: 1,
        y: 1,
        blur: 0,
        ...(shadowType === 'box-shadow' && { spread: 0 }),
        color: '#000000',
      },
    ];
    handleShadowsChange(newShadows);
  };

  const handleRemoveShadow = (index: number) => {
    const newShadows = shadows.filter((_, i) => i !== index);
    handleShadowsChange(newShadows);
  };

  const handleUpdateShadow = (index: number, updates: Partial<ShadowItem>) => {
    const newShadows = shadows.map((shadow, i) =>
      i === index ? { ...shadow, ...updates } : shadow
    );
    handleShadowsChange(newShadows);
  };

  const handleClearShadows = () => {
    handleShadowsChange([]);
  };

  const handleApplyOutline = () => {
    let outlineShadows: ShadowItem[];

    if (shadowType === 'text-shadow') {
      // 文字外描边效果
      outlineShadows = [
        { x: 1, y: 0, blur: 0, color: '#000000' },
        { x: -1, y: 0, blur: 0, color: '#000000' },
        { x: 0, y: 1, blur: 0, color: '#000000' },
        { x: 0, y: -1, blur: 0, color: '#000000' },
      ];
    } else {
      // 其他阴影类型的默认效果
      outlineShadows = [
        {
          x: 2,
          y: 2,
          blur: 4,
          ...(shadowType === 'box-shadow' && { spread: 0 }),
          color: '#000000',
        },
      ];
    }

    handleShadowsChange(outlineShadows);
  };

  // 统一设置所有阴影颜色
  const handleSetAllColors = (color: string) => {
    if (shadows.length === 0) return;

    const newShadows = shadows.map(shadow => ({
      ...shadow,
      color: color,
    }));
    handleShadowsChange(newShadows);
  };

  // 获取所有阴影的统一颜色（如果所有颜色相同则显示，否则显示默认值）
  const getUnifiedColor = () => {
    if (shadows.length === 0) return '';
    const firstColor = shadows[0].color;
    const allSameColor = shadows.every(shadow => shadow.color === firstColor);
    return allSameColor ? firstColor : '';
  };

  return (
    <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs' style={{ color: '#151515' }}>
          {title}
        </Label>

        <Icon
          name='plus'
          className='cursor-pointer'
          size={16}
          color='#151515'
          onClick={handleAddShadow}
        />
      </div>

      {/* 统一颜色选择器 */}
      {shadows.length > 0 && (
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-600'>统一颜色:</span>
          <ColorPickerPopover
            value={getUnifiedColor()}
            useThemeColor={false}
            onChange={value => {
              console.log('value', value, colorValueBuilder(value));
              handleSetAllColors(colorValueBuilder(value) || '');
            }}
          />
        </div>
      )}

      {shadows.map((item, index) => (
        <div className='flex items-center justify-between' key={index}>
          <ColorPickerPopover
            value={item.color}
            onChange={value => {
              handleUpdateShadow(index, {
                color: colorValueBuilder(value),
              });
            }}
          />

          <span className='text-xs'>水平</span>
          <input
            placeholder='1px'
            className='bg-transparent p-1 text-xs w-6'
            value={item.x}
            onChange={e => {
              handleUpdateShadow(index, { x: +e.target.value });
            }}
          />
          <span className='text-xs'>垂直</span>
          <input
            placeholder='1px'
            className='bg-transparent p-1 text-xs w-6'
            value={item.y}
            onChange={e => {
              handleUpdateShadow(index, { y: +e.target.value });
            }}
          />
          <span className='text-xs'>模糊</span>
          <input
            placeholder='1px'
            className='bg-transparent p-1 text-xs w-6'
            min={0}
            value={item.blur}
            onChange={e => {
              handleUpdateShadow(index, { blur: +e.target.value });
            }}
          />
          {shadowType === 'box-shadow' && (
            <>
              <span className='text-xs'>扩散</span>
              <input
                placeholder='1px'
                className='bg-transparent p-1 text-xs w-6'
                value={item.spread || 0}
                onChange={e => {
                  handleUpdateShadow(index, { spread: +e.target.value });
                }}
              />
            </>
          )}
          <Icon
            name='minus'
            className='cursor-pointer'
            size={16}
            color='#151515'
            onClick={() => handleRemoveShadow(index)}
          />
        </div>
      ))}

      {showPresets && (
        <div className='flex flex-wrap mt-1 gap-2'>
          <div
            className='text-xs rounded-sm cursor-pointer text-gray-500 hover:bg-gray-200'
            onClick={handleApplyOutline}
          >
            {shadowType === 'text-shadow' ? '文字外描边' : '默认阴影'}
          </div>
          <div
            className='text-xs rounded-sm cursor-pointer text-gray-500 hover:bg-gray-200'
            onClick={handleClearShadows}
          >
            清空
          </div>
        </div>
      )}
    </div>
  );
};

export default ShadowSetting;

export { formatShadow, normalizeColor, parseShadow };
