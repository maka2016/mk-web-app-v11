'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { ConfigProvider, Radio as AntdRadio, RadioProps } from 'antd';

const Radio: React.FC<RadioProps> = props => {
  return (
    <ConfigProvider
      theme={{
        components: {
          Radio: {
            radioSize: 18,
          },
        },
      }}
    >
      <AntdRadio {...props} className={cls(styles.main, props.className)}>
        {props.children}
      </AntdRadio>
    </ConfigProvider>
  );
};

export default Radio;
