import {
  AArrowDown,
  AlignCenter,
  AlignHorizontalSpaceAround,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BetweenHorizontalStart,
  Bold,
  ExternalLink,
  Italic,
  Minus,
  Strikethrough,
  TextQuote,
  Type,
  Underline,
  Variable,
} from 'lucide-react';
import FontFamilySelector from '../FontFamilySelector';

import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { IconInput } from '@workspace/ui/components/icon-input';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { trpc } from '../../../../utils/trpc';
import ShadowSetting from '../../componentsForEditor/ElementAttrsEditorV2/ShadowSetting';
import SwitchLite from '../../componentsForEditor/SwitchLite';
import {
  getSystemVariableList,
  SYSTEM_VARIABLES,
  SystemVariableKey,
} from '../../provider/system-provider';
import { useWorksStore } from '../../works-store/store/hook';
import ColorPickerPopover from '../ColorPicker';
import { colorValueBuilder } from '../ColorPicker/utils';
import { ListStyleSelector } from './TextStyleList/ListStyleSelector';

const textAlign = [
  {
    value: 'left',
    icon: AlignLeft,
  },
  {
    value: 'center',
    icon: AlignCenter,
  },
  {
    value: 'right',
    icon: AlignRight,
  },
  {
    value: 'justify',
    icon: AlignJustify,
  },
];

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

function isValidColor(colorStr: string): boolean {
  // 检查十六进制格式（#RGB或#RRGGBB）
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(colorStr)) return true;

  // 检查颜色关键字（如red, blue等）
  const colorKeywords = [
    'red',
    'blue',
    'green',
    'black',
    'white',
    'yellow',
    'purple',
  ];
  if (colorKeywords.includes(colorStr.toLowerCase())) return true;

  // 检查RGB/RGBA格式
  if (/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/.test(colorStr))
    return true;

  return false;
}

function parseStyleToValues(styleStr: string): {
  value: number;
  color: string;
} {
  // 1. 清理输入并分割字符串
  const cleaned = styleStr.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');

  // 2. 验证输入格式 - 如果格式不正确，返回默认值
  if (parts.length < 2) {
    return {
      value: 1,
      color: '#000000',
    };
  }

  // 3. 提取并转换数值部分
  const valuePart = parts[0];
  const numericValue = parseFloat(valuePart);

  if (isNaN(numericValue)) {
    return {
      value: 1,
      color: '#000000',
    };
  }

  // 4. 提取并验证颜色部分
  const colorPart = parts[parts.length - 1];
  if (!isValidColor(colorPart)) {
    return {
      value: numericValue,
      color: '#000000',
    };
  }

  return {
    value: numericValue,
    color: normalizeColor(colorPart),
  };
}

/**
 * 解析letterSpacing值，移除px单位并返回数字
 * @param letterSpacing - CSS letterSpacing值（如 "2px" 或 2）
 * @returns 数字值
 */
function parseLetterSpacing(
  letterSpacing: string | number | undefined
): number {
  if (!letterSpacing) return 0;
  if (typeof letterSpacing === 'number') return letterSpacing;
  return parseFloat(letterSpacing.replace('px', '')) || 0;
}

/**
 * 解析paragraphSpacing值，移除px单位并返回数字
 * @param paragraphSpacing - CSS paragraphSpacing值（如 "12px" 或 12）
 * @returns 数字值
 */
function parseParagraphSpacing(
  paragraphSpacing: string | number | undefined
): number {
  if (!paragraphSpacing) return 0;
  if (typeof paragraphSpacing === 'number') return paragraphSpacing;
  return parseFloat(String(paragraphSpacing).replace('px', '')) || 0;
}

interface Props {
  attrs: Record<string, any>;
  onChange: (nextVal: {
    textAlign?: string;
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    paragraphSpacing?: number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textIndent?: string;
    writingMode?: string;
    fontFamily?: string;
    fontUrl?: string;
    color?: string;
    WebkitTextStroke?: string;
    textShadow?: string;
    isList?: boolean;
    listStyle?: string;
    systemVariable?: {
      enabled: boolean;
      key?: SystemVariableKey;
    };
  }) => void;
}

const TextSettingDiv = styled.div`
  .title {
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;
    color: #000;
  }
  span,
  input {
    color: #151515;
  }
`;

const TextSettingForDesigner = (props: Props) => {
  const worksStore = useWorksStore();
  const { attrs } = props;
  const itemStyle = attrs || {};

  const [stroke, setStroke] = useState<
    { value: number; color: string } | undefined
  >(
    itemStyle?.WebkitTextStroke
      ? parseStyleToValues(itemStyle.WebkitTextStroke)
      : undefined
  );

  const onChange = (nextVal: any) => {
    props.onChange?.(nextVal);
  };

  const onChangeStyle = (nextStyle: any) => {
    props.onChange?.({
      ...attrs,
      ...nextStyle,
    });
  };

  // 获取系统变量列表
  const systemVariables = getSystemVariableList();

  // 获取当前变量配置
  const systemVariableConfig = attrs?.systemVariable || {
    enabled: false,
    key: undefined,
  };

  // 调试弹窗状态
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugValue, setDebugValue] = useState('');

  // 打开调试预览
  const handleDebugPreview = () => {
    if (!systemVariableConfig.key) {
      toast.error('请先选择变量');
      return;
    }

    const worksDetail = worksStore?.worksDetail;
    if (!worksDetail?.id) {
      toast.error('无法获取作品ID');
      return;
    }

    // 获取选中变量的URL参数名
    const variableKey = systemVariableConfig.key as SystemVariableKey;
    const selectedVariable = SYSTEM_VARIABLES[variableKey];
    if (!selectedVariable) {
      toast.error('变量配置错误');
      return;
    }

    // 构建view链接
    const baseUrl = `${window.location.origin}/viewer2/${worksDetail.id}`;
    const url = new URL(baseUrl);
    // 使用输入的值，如果没有输入则使用 attrs.text 作为默认值
    url.searchParams.set(
      selectedVariable.urlParam,
      debugValue || attrs?.text || ''
    );

    // 在新窗口打开
    window.open(url.toString(), '_blank');
    setDebugDialogOpen(false);
    setDebugValue('');
  };

  return (
    <TextSettingDiv className='flex flex-col gap-1.5 p-2'>
      {/* <div className="title">字体样式</div> */}
      <ToggleGroup
        type='single'
        size='sm'
        value={attrs?.textAlign || 'left'}
        onValueChange={value => value && onChange({ textAlign: value })}
        className='gap-0 p-0.5 h-6'
      >
        {textAlign.map(item => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            className='h-5 px-1 min-w-5'
          >
            <item.icon size={12} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type='multiple'
        size='sm'
        value={[
          ...(attrs?.fontWeight === 'bold' ? ['bold'] : []),
          ...(attrs?.fontStyle === 'italic' ? ['italic'] : []),
          ...(attrs?.textDecoration === 'underline' ? ['underline'] : []),
          ...(attrs?.textDecoration === 'line-through'
            ? ['strikethrough']
            : []),
          ...(attrs?.textIndent === '2em' ? ['indent'] : []),
          ...(attrs?.writingMode === 'vertical-lr' ? ['vertical'] : []),
        ]}
        onValueChange={values => {
          const changes: any = {};

          // Handle font weight
          changes.fontWeight = values.includes('bold') ? 'bold' : 'normal';

          // Handle font style
          changes.fontStyle = values.includes('italic') ? 'italic' : 'normal';

          // Handle text decoration (mutually exclusive)
          // If both underline and strikethrough are present, prioritize the last one clicked
          const hasUnderline = values.includes('underline');
          const hasStrikethrough = values.includes('strikethrough');

          if (hasUnderline && hasStrikethrough) {
            // If both are selected, keep only the one that wasn't previously active
            const wasUnderline = attrs?.textDecoration === 'underline';
            changes.textDecoration = wasUnderline
              ? 'line-through'
              : 'underline';
          } else if (hasUnderline) {
            changes.textDecoration = 'underline';
          } else if (hasStrikethrough) {
            changes.textDecoration = 'line-through';
          } else {
            changes.textDecoration = 'none';
          }

          // Handle text indent
          changes.textIndent = values.includes('indent') ? '2em' : 0;

          // Handle writing mode
          changes.writingMode = values.includes('vertical')
            ? 'vertical-lr'
            : 'horizontal-tb';

          onChange(changes);
        }}
        className='gap-0.5 p-0.5 h-6'
      >
        <ToggleGroupItem value='bold' className='h-5 px-1 min-w-5'>
          <Bold size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='italic' className='h-5 px-1 min-w-5'>
          <Italic size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='underline' className='h-5 px-1 min-w-5'>
          <Underline size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='strikethrough' className='h-5 px-1 min-w-5'>
          <Strikethrough size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='indent' className='h-5 px-1 min-w-5'>
          <TextQuote size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='vertical' className='h-5 px-1 min-w-5'>
          <AArrowDown size={12} />
        </ToggleGroupItem>
      </ToggleGroup>
      <div className='flex items-center gap-1'>
        <IconInput
          icon2={<Type size={12} />}
          type='number'
          value={attrs?.fontSize || 16}
          onChange={e => {
            const value = e.target.value;
            onChange({
              fontSize: +value,
            });
          }}
        />
        <IconInput
          icon2={<BetweenHorizontalStart size={12} />}
          type='number'
          step={0.1}
          value={itemStyle?.lineHeight}
          onChange={e => {
            const value = e.target.value;
            onChangeStyle({
              lineHeight: +value,
            });
          }}
        />
        <IconInput
          icon2={<AlignHorizontalSpaceAround size={12} />}
          type='number'
          step={0.1}
          value={parseLetterSpacing(itemStyle?.letterSpacing)}
          onChange={e => {
            const value = e.target.value;
            onChangeStyle({
              letterSpacing: +value,
            });
          }}
        />
        <IconInput
          icon2={<BetweenHorizontalStart size={12} className='rotate-90' />}
          type='number'
          step={1}
          value={parseParagraphSpacing(itemStyle?.paragraphSpacing)}
          onChange={e => {
            const value = e.target.value;
            onChangeStyle({
              paragraphSpacing: +value,
            });
          }}
        />
      </div>

      <div className='flex items-center gap-2'>
        <FontFamilySelector
          value={attrs.fontFamily}
          onChange={value => {
            onChange({
              fontFamily: value.fontFamily,
              fontUrl: value.fontUrl,
            });
          }}
        />
        <ColorPickerPopover
          value={attrs.color}
          onChange={value => {
            onChange({
              color: colorValueBuilder(value),
            });
          }}
        />
      </div>

      <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs' style={{ color: '#151515' }}>
            文字描边
          </Label>
          <SwitchLite
            active={!!stroke}
            onChange={active => {
              if (active) {
                setStroke({
                  value: 1,
                  color: '#000000',
                });
                onChangeStyle({
                  WebkitTextStroke: `1px #000000`,
                });
              } else {
                setStroke(undefined);
                onChangeStyle({
                  WebkitTextStroke: '',
                });
              }
            }}
          />
        </div>
        {stroke && (
          <div className='flex items-center gap-1'>
            <ColorPickerPopover
              value={stroke.color}
              onChange={value => {
                setStroke({
                  ...stroke,
                  color: colorValueBuilder(value) || '#000000',
                });
                onChangeStyle({
                  WebkitTextStroke: value
                    ? `${stroke.value}px ${value ? value.hex || value.value : '#000000'}`
                    : undefined,
                });
              }}
            />
            <div
              className='text-xs p-1'
              style={{
                marginLeft: 2,
                minWidth: 70,
              }}
            >
              {stroke.color}
            </div>
            <Minus size={12} />
            <input
              placeholder='1px'
              className='bg-transparent p-1 text-xs w-10'
              type='number'
              min={0}
              value={stroke.value}
              onChange={e => {
                const value = +e.target.value;
                setStroke({
                  ...stroke,
                  value,
                });
                onChangeStyle({
                  WebkitTextStroke: `${value}px ${stroke.color}`,
                });
              }}
            />
          </div>
        )}
      </div>

      {/* 列表设置 */}
      <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs' style={{ color: '#151515' }}>
            文字列表
          </Label>
          <SwitchLite
            active={!!attrs?.isList}
            onChange={checked => {
              onChange({
                isList: checked,
                listStyle: checked ? 'list-style-type: disc' : undefined,
              });
            }}
          />
        </div>
        {attrs?.isList && (
          <ListStyleSelector
            listStyle={attrs?.listStyle}
            onChange={listStyle => onChange({ listStyle })}
          />
        )}
      </div>

      <ShadowSetting
        title='文字阴影'
        shadowType='text-shadow'
        cssValue={itemStyle?.textShadow}
        onCssChange={cssValue => {
          onChangeStyle({
            textShadow: cssValue,
          });
        }}
      />
      {/* 系统变量容器配置 */}
      <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Variable size={14} className='text-gray-600' />
            <Label className='text-xs' style={{ color: '#151515' }}>
              系统变量
            </Label>
          </div>
          <SwitchLite
            active={systemVariableConfig.enabled}
            onChange={async enabled => {
              const worksDetail = worksStore?.worksDetail;
              const isTemplate = /^T_/gi.test(worksDetail?.id || '');
              if (
                enabled &&
                worksDetail?.share_type !== 'invite' &&
                worksDetail?.id
              ) {
                if (isTemplate) {
                  await trpc.template.update.mutate({
                    id: worksDetail.id,
                    share_type: 'invite',
                  });
                  worksStore?.updateWorksDetailPurely({
                    share_type: 'invite',
                  });
                } else {
                  await worksStore?.api.updateWorksDetail({
                    share_type: 'invite',
                  });
                }
                toast.success('已将作品的分享流程改为支持指定邀请');
              }
              const selectedKey = enabled
                ? systemVariableConfig.key || systemVariables[0]?.key
                : undefined;
              onChange({
                systemVariable: {
                  enabled,
                  key: selectedKey,
                },
              });
            }}
          />
        </div>
        {systemVariableConfig.enabled && (
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-1'>
              <Label className='text-xs text-gray-600'>选择变量</Label>
              <Select
                value={systemVariableConfig.key || ''}
                onValueChange={(value: SystemVariableKey) => {
                  onChange({
                    systemVariable: {
                      ...systemVariableConfig,
                      key: value,
                    },
                  });
                }}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue placeholder='请选择变量' />
                </SelectTrigger>
                <SelectContent>
                  {systemVariables.map(variable => (
                    <SelectItem key={variable.key} value={variable.key}>
                      {variable.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 调试按钮 */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                if (!systemVariableConfig.key) {
                  toast.error('请先选择变量');
                  return;
                }
                // 使用 attrs.text 作为默认值
                setDebugValue(attrs?.text || '');
                setDebugDialogOpen(true);
              }}
              className='flex items-center gap-2 h-8 text-xs'
            >
              <ExternalLink size={14} />
              <span>调试预览</span>
            </Button>
          </div>
        )}
      </div>

      {/* 调试弹窗 */}
      <ResponsiveDialog
        isOpen={debugDialogOpen}
        onOpenChange={setDebugDialogOpen}
        title='调试预览'
      >
        <div className='flex flex-col gap-4 p-4'>
          <div className='flex flex-col gap-2'>
            <Label className='text-sm'>
              输入{' '}
              {systemVariableConfig.key
                ? SYSTEM_VARIABLES[
                    systemVariableConfig.key as SystemVariableKey
                  ]?.label
                : '变量'}{' '}
              的值
            </Label>
            <Input
              type='text'
              placeholder={attrs?.text || '请输入值'}
              value={debugValue}
              onChange={e => setDebugValue(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleDebugPreview();
                }
              }}
            />
          </div>
          <div className='flex gap-2 justify-end'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setDebugDialogOpen(false);
                setDebugValue('');
              }}
            >
              取消
            </Button>
            <Button size='sm' onClick={handleDebugPreview}>
              打开预览
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </TextSettingDiv>
  );
};

export default observer(TextSettingForDesigner);
