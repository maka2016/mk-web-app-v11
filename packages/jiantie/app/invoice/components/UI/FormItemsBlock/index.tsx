'use client';
import React from 'react';
import styles from './index.module.scss';

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
      <div style={{ marginBottom: 20 }}>{props.children}</div>
    </div>
  );
};

export default FormItemsBlock;
