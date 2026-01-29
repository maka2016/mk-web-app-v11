import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip';

export interface IconProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  title?: string;
  name: string;
  color?: string;
  /** 字体大小 */
  size?: number;
  style?: React.CSSProperties;
  placement?: string;
  stroke?: string;
}

export const Icon = (props: IconProps) => {
  const {
    name,
    color = 'currentcolor',
    style,
    title,
    className,
    size = 20,
    placement = 'bottom',
    stroke,
    ...other
  } = props;
  const iconStyle = Object.assign({}, style, {
    color,
    fontSize: size,
  });

  const iconDOM = React.createElement('iconpark-icon', {
    suppressHydrationWarning: true,
    name,
    color,
    stroke,
    fill: 'currentcolor',
    class: className,
    style: iconStyle,
    ...other,
  });

  return title ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{iconDOM}</TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    iconDOM
  );
};
export const IconPark = Icon;
