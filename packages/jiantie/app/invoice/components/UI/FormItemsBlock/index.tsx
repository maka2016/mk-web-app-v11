'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { ConfigProvider, Form } from 'antd';

interface Props {
  title: React.ReactNode;

  desc?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;

  styles?: {
    header: React.CSSProperties;
  };
}

const FormItemsBlock: React.FC<Props> = props => {
  return (
    <div className={styles.main} style={props.style}>
      <div className={styles.formItemsBlockTitle} style={props.styles?.header}>
        {props.title}
        {props.desc && <span className={styles.desc}>{props.desc}</span>}
      </div>
      <ConfigProvider
        theme={{
          components: {
            Form: {
              itemMarginBottom: 20,
            },
          },
        }}
      >
        {props.children}
      </ConfigProvider>
    </div>
  );
};

export default FormItemsBlock;
