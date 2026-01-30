/* eslint-disable react/display-name */
import { EventEmitter, random } from '@/utils';
import clas from 'classnames';
import React, { useRef } from 'react';

export interface Behavior {
  /** 容器业务类型 */
  object_type: string;
  /** 容器实例 id */
  object_id?: string;
  /** 容器实例id,一般格式为{object_type}_随机数 */
  object_inst_id?: string;
  /** 本容器排序，从0开始 */
  ref_page_id?: string;
  object_order?: string;
  parent_type?: string;
  parent_id?: string;
  parent_inst_id?: string;
  parent_page_type?: string;
}

export interface UIBehaviorProps {
  /** 组件行为埋点，参考：https://www.feishu.cn/sheets/shtcnPBfwCRVwTn159QGFBwzwAd */
  behavior?: Behavior;
}

export interface BehaviorBoxProps
  extends React.HTMLAttributes<HTMLElement>,
    UIBehaviorProps {
  component?: 'div' | 'span';
}

const parseBehavior2Attr = (behavior?: Behavior) => {
  const dataAttrs: Record<string, any> = {};
  if (!behavior) return dataAttrs;
  Object.keys(behavior).forEach(b => {
    dataAttrs[`data-behavior-${b}`] = behavior[b as keyof Behavior];
  });
  return dataAttrs;
};

const behaviorFilter = (behavior?: Behavior) => {
  if (!behavior) return {} as Behavior;
  if (!behavior.object_inst_id) {
    behavior.object_inst_id = `${behavior.object_type}_${random(25)}`;
  }
  return behavior;
};

function observeVisibility(
  element: HTMLElement,
  callback: (
    isVisible: boolean,
    entry: IntersectionObserverEntry | undefined
  ) => void
) {
  if (!element) {
    console.warn('No element to observe');
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      callback(entry?.isIntersecting ?? false, entry);
    },
    {
      root: null, // 视口
      threshold: 0.01, // 元素至少有 1% 可见时触发
    }
  );

  observer.observe(element);

  return observer;
}

export const BehaviorBox = React.forwardRef<any, BehaviorBoxProps>(
  (
    { children, component: C = 'div', behavior, className, ...props },
    refProps
  ) => {
    const dataAttrs = parseBehavior2Attr(behaviorFilter(behavior));
    const currRef = useRef<HTMLElement | null>(null);
    React.useEffect(() => {
      if (behavior) {
        let timeoutId: NodeJS.Timeout | null = null;
        const observer = observeVisibility(
          currRef.current as HTMLElement,
          isVisible => {
            if (isVisible) {
              // 停留一秒后才广播
              timeoutId = setTimeout(() => {
                EventEmitter.emit('mkTrackerMount', behavior);
              }, 1000);
            } else {
              // 如果元素不可见，清除定时器
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          }
        );

        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (observer) {
            observer.disconnect();
          }
        };
      }
      return () => {};
    }, []);

    return (
      <C
        {...props}
        className={clas(className, '__mk-tracker__')}
        ref={(el: any) => {
          if (!el) return;
          currRef.current = el;
          if (typeof refProps === 'function') {
            refProps(el);
          } else if (refProps) {
            refProps.current = el;
          }
        }}
        data-behavior={behavior ? JSON.stringify(behavior) : undefined}
        data-tracker={Object.keys(dataAttrs).length > 0}
      >
        {children}
      </C>
    );
  }
);
