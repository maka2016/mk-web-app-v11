import styled from '@emotion/styled';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Slider } from '@workspace/ui/components/slider';
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
  gap: 10px;
  width: 100%;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const Title = styled.div`
  font-size: 14px;
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

const Description = styled.div`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: -4px;
`;

const EffectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const EffectButton = styled.button<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: 6px;
  border: 1px solid
    ${props => (props.active ? 'hsl(var(--primary))' : 'hsl(var(--border))')};
  background: ${props =>
    props.active ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--background))'};
  color: ${props =>
    props.active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }

  span {
    font-size: 12px;
    font-weight: 500;
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
    transition: all 0.2s ease;
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
    value: 'slide',
    label: '（废弃）',
    icon: X,
    description: '废弃的动画类型',
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
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid hsl(var(--border));
`;

const ConfigItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ConfigLabel = styled.label`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
`;

const SliderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SliderValue = styled.div`
  font-size: 12px;
  color: hsl(var(--foreground));
  min-width: 36px;
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

  // 处理空值、字符串类型和对象类型，转换为完整的配置对象
  const internalValue: PageAnimationConfig = React.useMemo(() => {
    if (!value) {
      return {
        type: 'slide',
        duration: 0.5,
        delay: 0,
        easing: 'easeInOut',
        autoplay: false,
        autoplayInterval: 15,
      };
    }

    if (typeof value === 'string') {
      return {
        type: value,
        duration: 0.5,
        delay: 0,
        easing: 'easeInOut',
        autoplay: false,
        autoplayInterval: 15,
      };
    }

    return value;
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
      <Description>选择页面切换时的动画效果，让页面过渡更加生动</Description>
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
          <ConfigItem>
            <ConfigLabel>动画时长 (秒)</ConfigLabel>
            <SliderWrapper>
              <Slider
                value={[duration]}
                min={0.1}
                max={5}
                step={0.1}
                onValueChange={values => handleChange({ duration: values[0] })}
              />
              <SliderValue>{duration}s</SliderValue>
            </SliderWrapper>
          </ConfigItem>

          <ConfigItem>
            <ConfigLabel>延迟时间 (秒)</ConfigLabel>
            <SliderWrapper>
              <Slider
                value={[delay]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={values => handleChange({ delay: values[0] })}
              />
              <SliderValue>{delay}s</SliderValue>
            </SliderWrapper>
          </ConfigItem>

          <ConfigItem>
            <ConfigLabel>缓动效果</ConfigLabel>
            <Select
              value={internalValue.easing ?? 'easeInOut'}
              onValueChange={value => handleChange({ easing: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择缓动效果' />
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
            <div className='flex items-center justify-between'>
              <ConfigLabel>自动播放</ConfigLabel>
              <Switch
                checked={internalValue.autoplay ?? false}
                onCheckedChange={checked => handleChange({ autoplay: checked })}
              />
            </div>
          </ConfigItem>

          {internalValue.autoplay && (
            <ConfigItem>
              <ConfigLabel>自动播放间隔 (秒)</ConfigLabel>
              <SliderWrapper>
                <Slider
                  value={[autoplayInterval]}
                  min={1}
                  max={30}
                  step={0.5}
                  onValueChange={values =>
                    handleChange({ autoplayInterval: values[0] })
                  }
                />
                <SliderValue>{autoplayInterval}s</SliderValue>
              </SliderWrapper>
            </ConfigItem>
          )}
        </ConfigSection>
      )}
    </Container>
  );
}
