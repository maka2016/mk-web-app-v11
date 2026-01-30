import styled from '@emotion/styled';
import {
  generateAnimationClasses,
  getAnimationType,
} from '../../hooks/useAnimate';
import { AnimateQueue, AnimationState } from '../../utils/animate';

interface AnimationSettingProps {
  targetId: string;
  value?: AnimateQueue;
  onChange: (value: AnimateQueue) => void;
}

const ANIMATION_TYPES = {
  entrance: [
    { label: '淡入', value: 'fadeIn' },
    { label: '滑入', value: 'slideInLeft' },
    { label: '弹入', value: 'bounceIn' },
    { label: '翻转', value: 'flipInX' },
    { label: '缩放', value: 'zoomIn' },
    { label: '旋转', value: 'rotateIn' },
  ],
  emphasis: [
    { label: '缩放', value: 'pulse' },
    { label: '摇摆', value: 'swing' },
    { label: '旋转', value: 'rotateIn' },
    { label: '闪烁', value: 'flash' },
    { label: '弹跳', value: 'bounce' },
    { label: '抖动', value: 'shakeX' },
  ],
  exit: [
    { label: '淡出', value: 'fadeOut' },
    { label: '滑出', value: 'slideOutRight' },
    { label: '弹出', value: 'bounceOut' },
    { label: '翻转', value: 'flipOutX' },
    { label: '缩放', value: 'zoomOut' },
    { label: '旋转', value: 'rotateOut' },
  ],
};

const TIMING_FUNCTIONS = [
  { label: '平滑', value: 'ease' },
  { label: '缓入', value: 'ease-in' },
  { label: '缓出', value: 'ease-out' },
  { label: '缓入缓出', value: 'ease-in-out' },
  { label: '线性', value: 'linear' },
];

const DELAYS = [
  { label: '无延迟', value: '0s' },
  { label: '0.5秒', value: '0.5s' },
  { label: '1秒', value: '1s' },
  { label: '1.5秒', value: '1.5s' },
];

const DURATIONS = [
  { label: '0.5秒', value: '0.5s' },
  { label: '1秒', value: '1s' },
  { label: '1.5秒', value: '1.5s' },
  { label: '2秒', value: '2s' },
  { label: '3秒', value: '3s' },
];

const EMPHASIS_DURATIONS = [
  { label: '无限制', value: '' },
  { label: '3秒', value: '3' },
  { label: '5秒', value: '5' },
  { label: '10秒', value: '10' },
  { label: '15秒', value: '15' },
];

const Container = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  gap: 12px;
  width: 100%;
  color: hsl(var(--foreground));
`;

const AnimationGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--card));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid hsl(var(--border));
`;

const GroupTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin: 0;
`;

const OptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  margin-bottom: 2px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Button = styled.button<{ active?: boolean }>`
  padding: 0 8px;
  border: 1px solid
    ${props => (props.active ? 'hsl(var(--primary))' : 'hsl(var(--border))')};
  border-radius: 4px;
  background: ${props =>
    props.active ? 'hsl(var(--primary))' : 'hsl(var(--background))'};
  color: ${props =>
    props.active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: ${props =>
      props.active ? 'hsl(var(--primary))' : 'hsl(var(--accent))'};
    border-color: ${props =>
      props.active ? 'hsl(var(--primary))' : 'hsl(var(--accent))'};
    color: ${props =>
      props.active
        ? 'hsl(var(--primary-foreground))'
        : 'hsl(var(--accent-foreground))'};
  }
`;

const SwitchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background: hsl(var(--primary));
  }

  &:checked + span:before {
    transform: translateX(16px);
  }

  &:focus-visible + span {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--muted));
  transition: 0.2s;
  border-radius: 20px;

  &:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background: hsl(var(--background));
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.1);
  }
`;

const ToggleButton = styled.button`
  padding: 0 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  gap: 4px;

  &:hover {
    background: hsl(var(--accent));
    border-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
`;

const AnimationContent = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-top: 8px;
`;

const playAnimation = (
  targetId: string,
  animation: AnimationState,
  animateQueue: AnimateQueue
) => {
  const targetDOM = document.getElementById(targetId);
  console.log('targetDOM', targetDOM);
  if (targetDOM) {
    const animationClasses = generateAnimationClasses(
      animation,
      getAnimationType(animation, animateQueue)
    );
    const classes = animationClasses.split(' ');
    targetDOM.classList.add(...classes);
    const handleAnimationEnd = () => {
      targetDOM.classList.remove(...classes);
      targetDOM.removeEventListener('animationend', handleAnimationEnd);
    };
    targetDOM.addEventListener('animationend', handleAnimationEnd);
  }
};

export default function AnimationSetting({
  targetId,
  value = {},
  onChange,
}: AnimationSettingProps) {
  const handleToggleAnimation = (type: 'entrance' | 'emphasis' | 'exit') => {
    const newValue = { ...value };
    if (newValue[type]?.length) {
      delete newValue[type];
    } else {
      newValue[type] = [
        {
          type: '',
          infinite: false,
          timing: 'ease',
          delay: '0s',
          duration: '1s',
        },
      ];
    }
    onChange(newValue);
    console.log('newValue', newValue);
    setTimeout(() => {
      if (newValue[type]?.[0]) {
        playAnimation(targetId, newValue[type]?.[0], newValue);
      }
    }, 500);
  };

  const handleChange = (
    type: 'entrance' | 'emphasis' | 'exit',
    key: keyof AnimationState,
    newValue: any
  ) => {
    const updatedValue = { ...value };
    if (updatedValue[type]?.[0]) {
      updatedValue[type][0] = { ...updatedValue[type][0], [key]: newValue };
      onChange(updatedValue);
      setTimeout(() => {
        if (updatedValue[type]?.[0]) {
          playAnimation(targetId, updatedValue[type]?.[0], updatedValue);
        }
      }, 500);
    }
  };

  return (
    <Container>
      <AnimationGroup>
        <GroupHeader>
          <GroupTitle>进场动画</GroupTitle>
          <ToggleButton onClick={() => handleToggleAnimation('entrance')}>
            {value.entrance?.length ? '删除动画' : '添加动画'}
          </ToggleButton>
        </GroupHeader>
        {value.entrance?.[0] && (
          <AnimationContent>
            <OptionGroup>
              <Label>动画类型</Label>
              <ButtonGroup>
                {ANIMATION_TYPES.entrance.map(type => (
                  <Button
                    key={type.value}
                    active={value.entrance?.[0]?.type === type.value}
                    onClick={() => handleChange('entrance', 'type', type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画时长</Label>
              <ButtonGroup>
                {DURATIONS.map(duration => (
                  <Button
                    key={duration.value}
                    active={value.entrance?.[0]?.duration === duration.value}
                    onClick={() =>
                      handleChange('entrance', 'duration', duration.value)
                    }
                  >
                    {duration.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画延迟</Label>
              <ButtonGroup>
                {DELAYS.map(delay => (
                  <Button
                    key={delay.value}
                    active={value.entrance?.[0]?.delay === delay.value}
                    onClick={() =>
                      handleChange('entrance', 'delay', delay.value)
                    }
                  >
                    {delay.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画曲线</Label>
              <ButtonGroup>
                {TIMING_FUNCTIONS.map(timing => (
                  <Button
                    key={timing.value}
                    active={value.entrance?.[0]?.timing === timing.value}
                    onClick={() =>
                      handleChange('entrance', 'timing', timing.value)
                    }
                  >
                    {timing.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>
          </AnimationContent>
        )}
      </AnimationGroup>

      <AnimationGroup>
        <GroupHeader>
          <GroupTitle>强调动画</GroupTitle>
          <ToggleButton onClick={() => handleToggleAnimation('emphasis')}>
            {value.emphasis?.length ? '删除动画' : '添加动画'}
          </ToggleButton>
        </GroupHeader>
        {value.emphasis?.[0] && (
          <AnimationContent>
            <OptionGroup>
              <Label>动画类型</Label>
              <ButtonGroup>
                {ANIMATION_TYPES.emphasis.map(type => (
                  <Button
                    key={type.value}
                    active={value.emphasis?.[0]?.type === type.value}
                    onClick={() => handleChange('emphasis', 'type', type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画时长</Label>
              <ButtonGroup>
                {DURATIONS.map(duration => (
                  <Button
                    key={duration.value}
                    active={value.emphasis?.[0]?.duration === duration.value}
                    onClick={() =>
                      handleChange('emphasis', 'duration', duration.value)
                    }
                  >
                    {duration.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画延迟</Label>
              <ButtonGroup>
                {DELAYS.map(delay => (
                  <Button
                    key={delay.value}
                    active={value.emphasis?.[0]?.delay === delay.value}
                    onClick={() =>
                      handleChange('emphasis', 'delay', delay.value)
                    }
                  >
                    {delay.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画曲线</Label>
              <ButtonGroup>
                {TIMING_FUNCTIONS.map(timing => (
                  <Button
                    key={timing.value}
                    active={value.emphasis?.[0]?.timing === timing.value}
                    onClick={() =>
                      handleChange('emphasis', 'timing', timing.value)
                    }
                  >
                    {timing.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>无限播放</Label>
              <SwitchContainer>
                <Switch>
                  <SwitchInput
                    type='checkbox'
                    checked={value.emphasis?.[0]?.infinite}
                    onChange={e =>
                      handleChange('emphasis', 'infinite', e.target.checked)
                    }
                  />
                  <SwitchSlider />
                </Switch>
              </SwitchContainer>
            </OptionGroup>

            {value.emphasis?.[0]?.infinite && (
              <OptionGroup>
                <Label>强调时长</Label>
                <ButtonGroup>
                  {EMPHASIS_DURATIONS.map(duration => (
                    <Button
                      key={duration.value}
                      active={
                        value.emphasis?.[0]?.emphasisDuration === duration.value
                      }
                      onClick={() =>
                        handleChange(
                          'emphasis',
                          'emphasisDuration',
                          duration.value
                        )
                      }
                    >
                      {duration.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </OptionGroup>
            )}

            <OptionGroup>
              <Label>往返播放</Label>
              <SwitchContainer>
                <Switch>
                  <SwitchInput
                    type='checkbox'
                    checked={value.emphasis?.[0]?.alternate}
                    onChange={e =>
                      handleChange('emphasis', 'alternate', e.target.checked)
                    }
                  />
                  <SwitchSlider />
                </Switch>
              </SwitchContainer>
            </OptionGroup>
          </AnimationContent>
        )}
      </AnimationGroup>

      <AnimationGroup>
        <GroupHeader>
          <GroupTitle>退场动画</GroupTitle>
          <ToggleButton onClick={() => handleToggleAnimation('exit')}>
            {value.exit?.length ? '删除动画' : '添加动画'}
          </ToggleButton>
        </GroupHeader>
        {value.exit?.[0] && (
          <AnimationContent>
            <OptionGroup>
              <Label>动画类型</Label>
              <ButtonGroup>
                {ANIMATION_TYPES.exit.map(type => (
                  <Button
                    key={type.value}
                    active={value.exit?.[0]?.type === type.value}
                    onClick={() => handleChange('exit', 'type', type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画时长</Label>
              <ButtonGroup>
                {DURATIONS.map(duration => (
                  <Button
                    key={duration.value}
                    active={value.exit?.[0]?.duration === duration.value}
                    onClick={() =>
                      handleChange('exit', 'duration', duration.value)
                    }
                  >
                    {duration.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画延迟</Label>
              <ButtonGroup>
                {DELAYS.map(delay => (
                  <Button
                    key={delay.value}
                    active={value.exit?.[0]?.delay === delay.value}
                    onClick={() => handleChange('exit', 'delay', delay.value)}
                  >
                    {delay.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>

            <OptionGroup>
              <Label>动画曲线</Label>
              <ButtonGroup>
                {TIMING_FUNCTIONS.map(timing => (
                  <Button
                    key={timing.value}
                    active={value.exit?.[0]?.timing === timing.value}
                    onClick={() => handleChange('exit', 'timing', timing.value)}
                  >
                    {timing.label}
                  </Button>
                ))}
              </ButtonGroup>
            </OptionGroup>
          </AnimationContent>
        )}
      </AnimationGroup>
    </Container>
  );
}
