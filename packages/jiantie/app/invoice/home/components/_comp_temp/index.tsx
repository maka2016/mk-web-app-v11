'use client';
import React from 'react';
import styles from './index.module.scss';

interface Props {}

const Comp: React.FC<Props> = props => {
  return <div className={styles.main}></div>;
};

export default Comp;
