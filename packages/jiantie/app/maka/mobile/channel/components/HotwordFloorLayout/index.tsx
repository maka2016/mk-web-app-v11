'use client';
import { Channel } from '@/services';
import styles from './index.module.scss';
import FloorWithCollections from '../FloorWithCollections';

interface Props {
  hotword: Channel; // 三级热词
  color?: string;
}

/**
 * 热词楼层布局组件
 * 展示三级热词下的所有四级楼层，每个楼层显示前4个五级集合
 */
const HotwordFloorLayout = (props: Props) => {
  const { hotword, color } = props;

  // 获取所有在线的楼层，并按 sort 排序
  const floors =
    hotword?.children
      ?.filter((item: Channel) => item.online === true)
      ?.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0)) || [];

  if (!hotword || floors.length === 0) {
    return <div className={styles.empty}>暂无楼层数据</div>;
  }

  return (
    <div className={styles.hotwordFloorLayout}>
      {floors.map((floor: Channel) => (
        <FloorWithCollections
          key={floor.documentId}
          floor={floor}
          color={color}
        />
      ))}
    </div>
  );
};

export default HotwordFloorLayout;
