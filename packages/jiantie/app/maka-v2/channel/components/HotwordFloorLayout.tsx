'use client';
import { Channel } from '@/services';
import FloorWithCollections from './FloorWithCollections';

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
    return (
      <div className='flex justify-center items-center py-[60px] px-5 text-[rgba(0,0,0,0.45)] text-sm text-center'>
        暂无楼层数据
      </div>
    );
  }

  return (
    <div className='bg-[#f5f5f5] py-3 min-h-[300px]'>
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
