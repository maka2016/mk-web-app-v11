import React from 'react';
import clas from 'classnames';
import { EventEmitter, random } from '@mk/utils';

export interface Behavior {
  /** 容器业务类型 */
  object_type: string;
  /** 容器实例 id */
  object_id?: string;
  /** 容器实例id,一般格式为{object_type}_随机数 */
  object_inst_id?: string;
  /** 本容器排序，从0开始 */
  object_order?: string;
  parent_type?: string;
  parent_id?: string;
  parent_inst_id?: string;
}

export interface UIBehaviorProps {
  /** 组件行为埋点，参考：https://www.feishu.cn/sheets/shtcnPBfwCRVwTn159QGFBwzwAd */
  behavior: Behavior;
}

export interface BehaviorBoxProps
  extends React.HTMLAttributes<HTMLElement>,
    UIBehaviorProps {
  component?: 'div' | 'span';
}

const parseBehavior2Attr = (behavior: Behavior) => {
  const dataAttrs: { [key: string]: any } = {};
  if (!behavior) return dataAttrs;
  Object.keys(behavior).forEach(b => {
    dataAttrs[`data-behavior-${b}`] = (behavior as any)[b];
  });
  return dataAttrs;
};

const behaviorFilter = (behavior: Behavior): Behavior => {
  if (!behavior.object_inst_id) {
    behavior.object_inst_id = `${behavior.object_type}_${random(25)}`;
  }
  return behavior;
};

export const BehaviorBox = React.forwardRef<any, BehaviorBoxProps>(
  function BoxRef(rootProps, ref) {
    const {
      children,
      component: C = 'div',
      behavior,
      className,
      ...props
    } = rootProps;
    const dataAttrs = parseBehavior2Attr(behaviorFilter(behavior));
    React.useEffect(() => {
      if (behavior) {
        EventEmitter.emit('TrackerMount', behavior);
      }
      return () => {};
    }, [behavior]);

    return (
      <C
        {...props}
        className={clas(className, '__tracker__')}
        ref={ref}
        data-behavior={behavior ? JSON.stringify(behavior) : undefined}
        data-tracker={Object.keys(dataAttrs).length > 0}
      >
        {children}
      </C>
    );
  }
);
