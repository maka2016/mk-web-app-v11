import React from 'react';

interface LayoutWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  component?: string | React.ComponentType<any>;
  componentProps?: Record<string, any>;
}

const LayoutWrapper = React.forwardRef<HTMLDivElement, LayoutWrapperProps>(
  (props, ref) => {
    const { children, component = 'div', componentProps = {}, ...rest } = props;
    return React.createElement(
      component,
      {
        ...componentProps,
        ...rest,
        ref,
        'data-component':
          (component as React.ComponentType<any>).displayName ||
          'LayoutWrapper',
      },
      children
    );
  }
);

LayoutWrapper.displayName = 'LayoutWrapper';

export default LayoutWrapper;
