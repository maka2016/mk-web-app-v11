import styled from '@emotion/styled';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import {
  BookOpen,
  FlipHorizontal,
  Maximize,
  MoveHorizontal,
  RotateCw,
  Sun,
  X,
} from 'lucide-react';
import React from 'react';
import { PageAnimationConfig } from '../../utils';

interface PageFlipEffectManagerProps {
  value?: PageAnimationConfig;
  onChange: (value: PageAnimationConfig) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
`;

const Title = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
  display: flex;
  align-items: center;
  gap: 6px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: hsl(var(--border));
    opacity: 0.5;
  }
`;

const EffectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
`;

const EffectButton = styled.button<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: 4px;
  border: 1px solid
    ${props => (props.active ? 'hsl(var(--primary))' : 'hsl(var(--border))')};
  background: ${props =>
    props.active ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--background))'};
  color: ${props =>
    props.active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'};
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.1);
  }

  svg {
    width: 16px;
    height: 16px;
  }

  span {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props =>
    props.active ? 'hsl(var(--primary))' : 'transparent'};
  }
`;

const ANIMATION_OPTIONS = [
  {
    value: 'none',
    label: '无',
    icon: X,
    description: '无动画效果',
  },
  {
    value: 'slide2',
    label: '滑动',
    icon: MoveHorizontal,
    description: '滑动动画类型v2',
  },
  {
    value: 'fade',
    label: '淡入淡出',
    icon: Sun,
    description: '优雅的渐变过渡效果',
  },
  {
    value: 'scale',
    label: '缩放',
    icon: Maximize,
    description: '动态的缩放切换效果',
  },
  {
    value: 'flip',
    label: '翻转',
    icon: FlipHorizontal,
    description: '3D翻转切换效果',
  },
  {
    value: 'rotate',
    label: '旋转',
    icon: RotateCw,
    description: '旋转切换效果',
  },
  {
    value: 'book',
    label: '翻书',
    icon: BookOpen,
    description: '真实的翻书效果',
  },
] as const;

const ConfigSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid hsl(var(--border));
`;

const ConfigItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ConfigLabel = styled.label`
  font-size: 11px;
  color: hsl(var(--muted-foreground));
`;

const ConfigRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const EASING_OPTIONS = [
  { value: 'easeInOut', label: '平滑' },
  { value: 'linear', label: '线性' },
  { value: 'easeIn', label: '渐入' },
  { value: 'easeOut', label: '渐出' },
  { value: 'circIn', label: '圆形渐入' },
  { value: 'circOut', label: '圆形渐出' },
  { value: 'circInOut', label: '圆形平滑' },
  { value: 'backIn', label: '回弹渐入' },
  { value: 'backOut', label: '回弹渐出' },
  { value: 'backInOut', label: '回弹平滑' },
  { value: '[0.25, 0.1, 0.25, 1]', label: '自定义贝塞尔' },
];

export default function PageFlipEffectManager(
  props: PageFlipEffectManagerProps
) {
  const { value, onChange } = props;

  // 处理空值、字符串类型和对象类型，转换为完整的配置对象（废弃的 slide 规范为 slide2）
  const internalValue: PageAnimationConfig = React.useMemo(() => {
    const base = {
      duration: 0.5,
      delay: 0,
      easing: 'easeInOut' as const,
      autoplay: false,
      autoplayInterval: 15,
    };
    if (!value) {
      return { type: 'slide2', ...base };
    }
    if (typeof value === 'string') {
      return { type: value === 'slide' ? 'slide2' : value, ...base };
    }
    return {
      ...value,
      type: value.type === 'slide' ? 'slide2' : value.type,
    };
  }, [value]);

  const handleChange = (updates: Partial<PageAnimationConfig>) => {
    // 如果之前是空值或字符串类型，且只更新了type，就返回基础配置
    if (
      (!value || typeof value === 'string') &&
      Object.keys(updates).length === 1 &&
      'type' in updates &&
      updates.type
    ) {
      onChange({
        type: updates.type,
        duration: 0.5,
        delay: 0,
        easing: 'easeInOut',
        autoplay: false,
        autoplayInterval: 15,
      });
    } else {
      // 否则返回完整的配置对象
      const newValue: PageAnimationConfig = {
        type: internalValue.type,
        duration: internalValue.duration ?? 0.5,
        delay: internalValue.delay ?? 0,
        easing: internalValue.easing ?? 'easeInOut',
        autoplay: internalValue.autoplay ?? false,
        autoplayInterval: internalValue.autoplayInterval ?? 15,
        ...updates,
      };
      onChange(newValue);
    }
  };

  // 确保所有可选值都有默认值
  const duration = internalValue.duration ?? 0.5;
  const delay = internalValue.delay ?? 0;
  const autoplayInterval = internalValue.autoplayInterval ?? 15;

  return (
    <Container>
      <Title>页面切换效果</Title>
      <EffectGrid>
        {ANIMATION_OPTIONS.map(option => {
          const Icon = option.icon;
          return (
            <EffectButton
              key={option.value}
              active={internalValue.type === option.value}
              onClick={() => handleChange({ type: option.value })}
              title={option.description}
            >
              <Icon />
              <span>{option.label}</span>
            </EffectButton>
          );
        })}
      </EffectGrid>

      {value && typeof value !== 'string' && (
        <ConfigSection>
          <ConfigRow>
            <ConfigItem>
              <ConfigLabel>时长(s)</ConfigLabel>
              <Input
                type="number"
                variantSize="sm"
                min={0.1}
                max={5}
                step={0.1}
                value={String(duration)}
                onChange={e => {
                  const n = parseFloat(e.target.value);
                  if (!Number.isNaN(n)) {
                    handleChange({
                      duration: Math.max(0.1, Math.min(5, n)),
                    });
                  }
                }}
              />
            </ConfigItem>
            <ConfigItem>
              <ConfigLabel>延迟(s)</ConfigLabel>
              <Input
                type="number"
                variantSize="sm"
                min={0}
                max={1}
                step={0.1}
                value={String(delay)}
                onChange={e => {
                  const n = parseFloat(e.target.value);
                  if (!Number.isNaN(n)) {
                    handleChange({
                      delay: Math.max(0, Math.min(1, n)),
                    });
                  }
                }}
              />
            </ConfigItem>
          </ConfigRow>

          <ConfigItem>
            <ConfigLabel>缓动</ConfigLabel>
            <Select
              value={internalValue.easing ?? 'easeInOut'}
              onValueChange={v => handleChange({ easing: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="缓动" />
              </SelectTrigger>
              <SelectContent>
                {EASING_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigItem>

          <ConfigItem>
            <div className="flex items-center justify-between gap-2">
              <ConfigLabel>自动播放</ConfigLabel>
              <Switch
                checked={internalValue.autoplay ?? false}
                onCheckedChange={checked => handleChange({ autoplay: checked })}
              />
            </div>
          </ConfigItem>

          {internalValue.autoplay && (
            <ConfigItem>
              <ConfigLabel>间隔(s)</ConfigLabel>
              <Input
                type="number"
                variantSize="sm"
                min={1}
                max={30}
                step={0.5}
                value={String(autoplayInterval)}
                onChange={e => {
                  const n = parseFloat(e.target.value);
                  if (!Number.isNaN(n)) {
                    handleChange({
                      autoplayInterval: Math.max(1, Math.min(30, n)),
                    });
                  }
                }}
              />
            </ConfigItem>
          )}
        </ConfigSection>
      )}
    </Container>
  );
}
