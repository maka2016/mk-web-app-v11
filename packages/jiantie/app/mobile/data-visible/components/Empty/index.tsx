import React from 'react';
import styles from './index.module.scss';
interface Props {
  title?: string;
}
const Empty = ({ title = '该表单暂无统计数据' }: Props) => {
  return (
    <div className={styles.empty}>
      <img
        src='https://img2.maka.im/cdn/webstore7/assets/form_empty.png'
        width={60}
        height={60}
        alt={title}
      />
      <span>{title}</span>
    </div>
  );
};

export default Empty;
