import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';

import {
  AnimateQueue2,
  AnimationState,
} from '@/components/GridEditorV3/works-store/types/animate2';
import { cdnApi } from '@/services';
import { Input } from '@workspace/ui/components/input';
import { Switch } from '@workspace/ui/components/switch';
import {
  animate,
  JSAnimation,
  stagger,
  text,
  TextSplitter,
  utils,
} from 'animejs';
import { animation2Data } from './animation2Data';

interface AnimationSettingProps {
  elementRef?: string;
  targetId: string;
  value?: AnimateQueue2;
  onChange: (value: AnimateQueue2) => void;
}

const templateList = [
  {
    // 文字字号大于48平移，小于48淡入
    // 其他元素面积大于5000上移，小于淡入
    type: 'multiple',
    name: '简约',
    direction: 'top-left',
    enterAnimationRef: 'Simple',
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },
  {
    // 画布左边向右浮入，画布右边向左浮入
    type: 'multiple',
    name: '浮入',
    direction: 'top-left',
    enterAnimationRef: 'FadeIn',
    duration: 1000,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_furu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_furu_active.png'
    ),
  },
  {
    name: '淡入淡出',
    direction: 'top-left',
    enterAnimationRef: 'FadeInNormal',
    delayTime: 200,
    duration: 1000,
    preview: cdnApi('/cdn/editor7/animation_template/preview_danru.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_danru_active.png?v=1'
    ),
  },
  {
    name: '擦除',
    direction: 'top-left',
    enterAnimationRef: 'EraseIn',
    duration: 300,
    delayTime: 200,
    preview: cdnApi('/cdn/editor7/animation_template/preview_cachu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_cachu_active.png'
    ),
  },
  {
    name: '弹出',
    direction: 'large-small',
    enterAnimationRef: 'ExpandFadeIn',
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_tanchu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_tanchu_active.png'
    ),
  },
  {
    // 向左滚入、向右滚入交替
    type: 'multiple',
    name: '滚动',
    direction: 'top-left',
    enterAnimationRef: 'RollIn',
    duration: 300,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_gundong.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_gundong_active.png'
    ),
  },
  {
    name: '砸落',
    direction: 'none',
    enterAnimationRef: 'SlideIn',
    duration: 500,
    delayTime: 0,
    preview: cdnApi('/cdn/editor7/animation_template/preview_zaluo.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_zaluo_active.png'
    ),
  },
  {
    name: '渐大',
    direction: 'top-left',
    enterAnimationRef: 'ZoomInLittle',
    duration: 1000,
    delayTime: 200,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianda.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianda_active.png'
    ),
  },
  {
    name: '闪入',
    direction: 'bottom-left',
    enterAnimationRef: 'FlickerIn',
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_shanru.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_shanru_active.png'
    ),
  },
  {
    name: '上升',
    direction: 'top-left',
    enterAnimationRef: 'FadeInUp',
    delayTime: 200,
    duration: 1000,
    preview: cdnApi('/cdn/editor7/animation_template/preview_shangsheng.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_shangsheng_active.png?v=1'
    ),
  },
  {
    name: '底部弹出',
    direction: 'top-left',
    enterAnimationRef: 'PopInBottom',
    duration: 300,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_dibutanchu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_dibutanchu_active.png'
    ),
  },
  {
    name: '平移',
    direction: 'top-left',
    enterAnimationRef: 'FadeInLeft',
    delayTime: 200,
    duration: 1000,
    preview: cdnApi('/cdn/editor7/animation_template/preview_pingyi.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_pingyi_active.png?v=1'
    ),
  },
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
  // display: grid;
  // grid-template-columns: repeat(2, 1fr);
  // gap: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
`;

export default function AnimationSetting({
  targetId,
  value = {},
  onChange,
  elementRef,
}: AnimationSettingProps) {
  const [animationQueue, setAnimationQueue] = useState<AnimateQueue2>(value);
  const textAnimateRef = useRef<JSAnimation>(null);
  const animateRef = useRef<JSAnimation>(null);
  const charsRef = useRef<any>(null);
  const splitRef = useRef<TextSplitter>(null);

  console.log('targetId', targetId);

  useEffect(() => {
    return () => {
      if (animateRef.current) {
        animateRef.current.complete();
        animateRef.current.revert();
        animateRef.current.cancel();
        animateRef.current = null;
      }
    };
  }, []);

  const onDeleteAnimation = (type: 'entrance' | 'emphasis' | 'exit') => {
    const newValue = { ...animationQueue };
    if (newValue[type]?.length) {
      delete newValue[type];
    }
    onChange(newValue);
    setAnimationQueue(newValue);
  };

  const playAnimation = (
    targetId: string,
    animation: AnimationState,
    animateQueue: AnimateQueue2
  ) => {
    console.log(`elem_wrapper_${targetId}`, targetId);
    const targetDOM = document.getElementById(`elem_wrapper_${targetId}`);
    console.log('targetDOM', targetDOM);
    if (!targetDOM) return;
    // ✅ 如果之前有动画实例，取消它
    if (animateRef.current) {
      animateRef.current.complete();
      animateRef.current.revert();
      animateRef.current.cancel();
      animateRef.current = null;
    }

    animateRef.current = animate(targetDOM, {
      ...animation.parameters,
      onComplete: () => {
        animateRef.current?.revert();
      },
    });
  };

  const playTextAnimation = (
    targetId: string,
    animation: AnimationState,
    animateQueue: AnimateQueue2
  ) => {
    const targetDOM = document.getElementById(`elem_wrapper_${targetId}`);
    if (!targetDOM) return;
    // ✅ 如果之前有动画实例，取消它
    if (textAnimateRef.current) {
      textAnimateRef.current.complete();
      textAnimateRef.current.revert();
      textAnimateRef.current.cancel();
      textAnimateRef.current = null;
    }
    // ✅ 或者移除所有目标上的动画（防止残留）
    if (charsRef.current) {
      utils.remove(charsRef.current);
    }

    if (!charsRef.current) {
      const split = text.split(targetDOM, {
        chars: true,
      });
      splitRef.current = split;
      charsRef.current = split.chars;
    }

    textAnimateRef.current = animate(charsRef.current, {
      ...animation.parameters,
      delay: stagger(animation.delay || 0, {
        start: animation.parameters.delay,
      }),
      onComplete: () => {
        textAnimateRef.current?.revert();
        splitRef.current?.revert();
        charsRef.current = null;
      },
      onPause: () => {
        textAnimateRef.current?.revert();
        splitRef.current?.revert();
        charsRef.current = null;
      },
    });
  };

  const playEmphasisAnimation = (
    targetId: string,
    animateQueue: AnimateQueue2
  ) => {
    const targetDOM = document.getElementById(`elem_wrapper_${targetId}`);
    if (!targetDOM) return;
    // ✅ 如果之前有动画实例，取消它
    if (animateRef.current) {
      animateRef.current.complete();
      animateRef.current.revert();
      animateRef.current.cancel();
      animateRef.current = null;
    }

    let params: any = {};
    // emphasisAnimateRef.current = createTimeline();
    animateQueue.emphasis?.forEach(item => {
      params = Object.assign(params, item.parameters);
    });

    animateRef.current = animate(targetDOM, {
      ...params,
      loop: params.loop === true ? 3 : params.loop,
      onComplete: () => {
        animateRef.current?.revert();
      },
    });
  };

  const handleChange = (
    type: 'entrance' | 'emphasis' | 'exit',
    newValue: any
  ) => {
    const updatedValue = { ...animationQueue };
    if (!updatedValue[type]) {
      updatedValue[type] = [];
    }
    updatedValue[type][0] = newValue;
    onChange(updatedValue);
    setAnimationQueue(updatedValue);
    setTimeout(() => {
      if (updatedValue[type]?.[0]) {
        if (updatedValue[type]?.[0].type === 'text') {
          playTextAnimation(targetId, updatedValue[type]?.[0], updatedValue);
        } else {
          playAnimation(targetId, updatedValue[type]?.[0], updatedValue);
        }
      }
    }, 500);
  };

  const handleChangeEmphasis = (newValue: any) => {
    const updatedValue = { ...animationQueue };
    if (!updatedValue.emphasis) {
      updatedValue.emphasis = [];
    }

    if (updatedValue.emphasis.some(item => item.id === newValue.id)) {
      updatedValue.emphasis = updatedValue.emphasis.filter(
        item => item.id !== newValue.id
      );
    } else {
      updatedValue.emphasis.push(newValue);
    }
    onChange(updatedValue);
    setAnimationQueue(updatedValue);
    setTimeout(() => {
      playEmphasisAnimation(targetId, updatedValue);
    }, 500);
  };

  return (
    <div>
      <Container>
        <AnimationGroup>
          <GroupHeader>
            <GroupTitle>进场动画</GroupTitle>
            {!!animationQueue.entrance?.length && (
              <ToggleButton onClick={() => onDeleteAnimation('entrance')}>
                删除动画
              </ToggleButton>
            )}
          </GroupHeader>
          <AnimationContent>
            {elementRef === 'Text' && (
              <OptionGroup>
                <Label>文字动画</Label>
                <ButtonGroup>
                  {animation2Data.text.entrance.map(item => {
                    const isActive =
                      animationQueue.entrance?.[0]?.id === item.id &&
                      animationQueue.entrance?.[0]?.type === 'text';
                    return (
                      <Button
                        key={item.id}
                        active={isActive}
                        onClick={() =>
                          handleChange('entrance', {
                            ...structuredClone(item), // 深拷贝，防止污染 animation2Data
                            type: 'text',
                          })
                        }
                      >
                        {item.name}
                      </Button>
                    );
                  })}
                </ButtonGroup>
              </OptionGroup>
            )}
            <OptionGroup>
              <Label>常规动画</Label>
              <ButtonGroup>
                {animation2Data.common.entrance.map(item => {
                  const isActive =
                    animationQueue.entrance?.[0]?.id === item.id &&
                    animationQueue.entrance?.[0]?.type === 'common';
                  return (
                    <Button
                      key={item.id}
                      active={isActive}
                      onClick={() =>
                        handleChange('entrance', {
                          ...structuredClone(item), // 深拷贝，防止污染 animation2Data
                          type: 'common',
                        })
                      }
                    >
                      {item.name}
                    </Button>
                  );
                })}
              </ButtonGroup>
            </OptionGroup>

            {animationQueue?.entrance?.[0] && (
              <>
                {animationQueue.entrance[0].type === 'text' ? (
                  <OptionGroup>
                    <Label>文字播放间隔(秒)</Label>
                    <div className='flex items-center gap-2'>
                      <Input
                        step={0.1}
                        type='number'
                        variantSize='sm'
                        value={
                          (animationQueue.entrance?.[0].delay || 0) / 1000 || 0
                        }
                        onChange={e => {
                          const updatedValue = { ...animationQueue };
                          if (!updatedValue?.entrance?.length) {
                            return;
                          }
                          if (Number(e.target.value) < 0) {
                            return;
                          }
                          updatedValue.entrance[0].delay =
                            Number(e.target.value) * 1000;
                          onChange(updatedValue);
                          setAnimationQueue(updatedValue);
                          playTextAnimation(
                            targetId,
                            updatedValue.entrance[0],
                            updatedValue
                          );
                        }}
                      />
                    </div>
                  </OptionGroup>
                ) : (
                  <OptionGroup>
                    <Label>动画时长(秒)</Label>

                    <Input
                      step={0.1}
                      type='number'
                      variantSize='sm'
                      value={
                        animationQueue.entrance?.[0].parameters.duration /
                          1000 || 0
                      }
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (!updatedValue?.entrance?.length) {
                          return;
                        }
                        if (Number(e.target.value) < 0) {
                          return;
                        }
                        updatedValue.entrance[0].parameters.duration =
                          Number(e.target.value) * 1000;
                        onChange(updatedValue);
                        setAnimationQueue(updatedValue);
                        playAnimation(
                          targetId,
                          updatedValue.entrance[0],
                          updatedValue
                        );
                      }}
                    />
                  </OptionGroup>
                )}
                {animationQueue?.entrance?.[0] && (
                  <OptionGroup>
                    <Label>动画延迟(秒)</Label>
                    <Input
                      step={0.1}
                      type='number'
                      variantSize='sm'
                      value={
                        animationQueue.entrance?.[0].parameters.delay / 1000 ||
                        0
                      }
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (!updatedValue?.entrance?.length) {
                          return;
                        }
                        if (Number(e.target.value) < 0) {
                          return;
                        }
                        updatedValue.entrance[0].parameters.delay =
                          Number(e.target.value) * 1000;
                        onChange(updatedValue);
                        setAnimationQueue(updatedValue);
                        if (updatedValue.entrance[0].type === 'text') {
                          playTextAnimation(
                            targetId,
                            updatedValue.entrance[0],
                            updatedValue
                          );
                        } else {
                          playAnimation(
                            targetId,
                            updatedValue.entrance[0],
                            updatedValue
                          );
                        }
                      }}
                    />
                  </OptionGroup>
                )}
              </>
            )}
          </AnimationContent>
        </AnimationGroup>

        <AnimationGroup>
          <GroupHeader>
            <GroupTitle>强调动画</GroupTitle>
            {/* {!!animationQueue.emphasis?.length && (
      <ToggleButton onClick={() => onDeleteAnimation("exit")}>
        删除动画
      </ToggleButton>
    )} */}
          </GroupHeader>
          <AnimationContent>
            <OptionGroup>
              <Label>动画类型</Label>
              <ButtonGroup>
                {animation2Data.common.emphasis.map(item => {
                  const isActive = animationQueue.emphasis?.some(
                    i => i.id === item.id
                  );
                  return (
                    <Button
                      key={item.id}
                      active={isActive}
                      onClick={() =>
                        handleChangeEmphasis({
                          ...structuredClone(item),
                          type: 'common',
                        })
                      }
                    >
                      {item.name}
                    </Button>
                  );
                })}
              </ButtonGroup>
            </OptionGroup>
            {animationQueue.emphasis && animationQueue.emphasis.length > 0 && (
              <>
                <OptionGroup>
                  <Label>动画速度(秒)</Label>
                  <Input
                    step={0.1}
                    type='number'
                    variantSize='sm'
                    value={
                      animationQueue.emphasis?.[0].parameters.duration / 1000 ||
                      0
                    }
                    onChange={e => {
                      const updatedValue = { ...animationQueue };
                      if (!updatedValue?.emphasis?.length) {
                        return;
                      }
                      if (Number(e.target.value) < 0) {
                        return;
                      }
                      updatedValue.emphasis?.forEach(item => {
                        item.parameters.duration =
                          Number(e.target.value) * 1000;
                      });
                      console.log('updatedValue', updatedValue);
                      onChange(updatedValue);
                      setAnimationQueue(updatedValue);
                      playEmphasisAnimation(targetId, updatedValue);
                    }}
                  />
                </OptionGroup>
                <OptionGroup>
                  <Label>循环次数</Label>
                  <div className='flex items-center gap-2'>
                    <Label>无限循环</Label>
                    <Switch
                      checked={
                        animationQueue.emphasis?.[0].parameters.loop === true
                      }
                      onCheckedChange={(value: boolean) => {
                        const updatedValue = { ...animationQueue };
                        if (!updatedValue?.emphasis?.length) {
                          return;
                        }

                        updatedValue.emphasis?.forEach(item => {
                          item.parameters.loop = value ? value : 0;
                        });
                        onChange(updatedValue);
                        setAnimationQueue(updatedValue);
                        console.log(updatedValue);
                        playEmphasisAnimation(targetId, updatedValue);
                      }}
                    />
                  </div>

                  {animationQueue.emphasis?.[0].parameters.loop !== true && (
                    <Input
                      step={1}
                      min={0}
                      type='number'
                      variantSize='sm'
                      value={animationQueue.emphasis?.[0].parameters.loop || 0}
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (!updatedValue?.emphasis?.length) {
                          return;
                        }
                        if (Number(e.target.value) < 1) {
                          return;
                        }
                        updatedValue.emphasis?.forEach(item => {
                          item.parameters.loop = Number(e.target.value);
                        });
                        console.log('updatedValue', updatedValue);
                        onChange(updatedValue);
                        setAnimationQueue(updatedValue);
                        playEmphasisAnimation(targetId, updatedValue);
                      }}
                    />
                  )}
                </OptionGroup>
              </>
            )}
          </AnimationContent>
        </AnimationGroup>
        <AnimationGroup>
          <GroupHeader>
            <GroupTitle>退场动画</GroupTitle>
            {!!animationQueue.exit?.length && (
              <ToggleButton onClick={() => onDeleteAnimation('exit')}>
                删除动画
              </ToggleButton>
            )}
          </GroupHeader>
          <AnimationContent>
            {elementRef === 'Text' && (
              <OptionGroup>
                <Label>文字动画</Label>
                <ButtonGroup>
                  {animation2Data.text.exit.map(item => {
                    const isActive = animationQueue.exit?.[0]?.id === item.id;
                    return (
                      <Button
                        key={item.id}
                        active={isActive}
                        onClick={() =>
                          handleChange('exit', {
                            ...structuredClone(item),
                            type: 'text',
                          })
                        }
                      >
                        {item.name}
                      </Button>
                    );
                  })}
                </ButtonGroup>
              </OptionGroup>
            )}

            <OptionGroup>
              <Label>常规动画</Label>
              <ButtonGroup>
                {animation2Data.common.exit.map(item => {
                  const isActive = animationQueue.exit?.[0]?.id === item.id;
                  return (
                    <Button
                      key={item.id}
                      active={isActive}
                      onClick={() =>
                        handleChange('exit', {
                          ...structuredClone(item),
                          type: 'common',
                        })
                      }
                    >
                      {item.name}
                    </Button>
                  );
                })}
              </ButtonGroup>
            </OptionGroup>

            {animationQueue?.exit?.[0] &&
              (animationQueue.exit[0].type === 'text' ? (
                <OptionGroup>
                  <Label>动画速度(秒)</Label>

                  <Input
                    step={0.1}
                    type='number'
                    variantSize='sm'
                    value={(animationQueue.exit?.[0].delay || 0) / 1000 || 0}
                    onChange={e => {
                      const updatedValue = { ...animationQueue };
                      if (!updatedValue?.exit?.length) {
                        return;
                      }
                      if (Number(e.target.value) < 0) {
                        return;
                      }
                      updatedValue.exit[0].delay =
                        Number(e.target.value) * 1000;
                      onChange(updatedValue);
                      setAnimationQueue(updatedValue);
                      playTextAnimation(
                        targetId,
                        updatedValue.exit[0],
                        updatedValue
                      );
                    }}
                  />
                </OptionGroup>
              ) : (
                <OptionGroup>
                  <Label>动画时长(秒)</Label>

                  <Input
                    step={0.1}
                    type='number'
                    variantSize='sm'
                    value={
                      animationQueue.exit?.[0].parameters.duration / 1000 || 0
                    }
                    onChange={e => {
                      const updatedValue = { ...animationQueue };
                      if (!updatedValue?.exit?.length) {
                        return;
                      }
                      if (Number(e.target.value) < 0) {
                        return;
                      }
                      updatedValue.exit[0].parameters.duration =
                        Number(e.target.value) * 1000;
                      onChange(updatedValue);
                      setAnimationQueue(updatedValue);
                      playTextAnimation(
                        targetId,
                        updatedValue.exit[0],
                        updatedValue
                      );
                    }}
                  />
                </OptionGroup>
              ))}

            {animationQueue?.exit?.[0] && (
              <OptionGroup>
                <Label>动画延迟(秒)</Label>

                <Input
                  step={0.1}
                  type='number'
                  variantSize='sm'
                  value={animationQueue.exit?.[0].parameters.delay / 1000 || 0}
                  onChange={e => {
                    const updatedValue = { ...animationQueue };
                    if (!updatedValue?.exit?.length) {
                      return;
                    }
                    if (Number(e.target.value) < 0) {
                      return;
                    }
                    updatedValue.exit[0].parameters.delay =
                      Number(e.target.value) * 1000;
                    onChange(updatedValue);
                    setAnimationQueue(updatedValue);
                    if (updatedValue.exit[0].type === 'text') {
                      playTextAnimation(
                        targetId,
                        updatedValue.exit[0],
                        updatedValue
                      );
                    } else {
                      playAnimation(
                        targetId,
                        updatedValue.exit[0],
                        updatedValue
                      );
                    }
                  }}
                />
              </OptionGroup>
            )}
          </AnimationContent>
        </AnimationGroup>
      </Container>
    </div>
  );
}
