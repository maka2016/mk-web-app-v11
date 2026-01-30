'use client';
import React from 'react';
import styles from './index.module.scss';

interface Props {
  emptyText?: React.ReactNode;

  emptyImg?: React.ReactNode;

  style?: React.CSSProperties;
}

const EmptyContent: React.FC<Props> = props => {
  return (
    <div className={styles.main} style={props.style}>
      {props.emptyImg !== undefined ? (
        props.emptyImg
      ) : (
        <div className={styles.imgWrap}>
          <img
            draggable={false}
            alt=''
            src='https://res.maka.im/assets/wenzy/table_empty.png'
          />
        </div>
      )}

      <div className={styles.emptyText}>{props.emptyText || `暂无数据`}</div>
    </div>
  );
};

export default EmptyContent;
