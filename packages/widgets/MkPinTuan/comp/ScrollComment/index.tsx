import React, { useEffect, useRef, useState } from 'react';
import './CommentScroller.scss';

const comments = [
  {
    name: '张伟',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image.png',
  },
  {
    name: '王芳',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-1.png',
  },
  {
    name: '李娜',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-2.png',
  },
  {
    name: '刘洋',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-3.png',
  },
  {
    name: '陈磊',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-4.png',
  },
  {
    name: '杨静',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-5.png',
  },
  {
    name: '赵强',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-6.png',
  },
  {
    name: '吴昊天',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-7.png',
  },
  {
    name: '周子涵',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-8.png',
  },
  {
    name: '徐梦洁',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-9.png',
  },
  {
    name: '孙浩然',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-10.png',
  },
  {
    name: '胡媛媛',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-11.png',
  },
  {
    name: '郭子轩',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-12.png',
  },
  {
    name: '林志远',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-13.png',
  },
  {
    name: '何雨桐',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-14.png',
  },
  {
    name: '高子怡',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-15.png',
  },
  {
    name: '马俊杰',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-16.png',
  },
  {
    name: '罗雪晴',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-17.png',
  },
  {
    name: '邓子瑜',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-18.png',
  },
  {
    name: '曹嘉欣',
    avatar: 'https://img2.maka.im/cdn/webstore10/xueji/avatars/image-19.png',
  },
];

interface CommnentItem {
  name: string;
  avatar: string;
}

const VISIBLE_COUNT = 2;
const ITEM_HEIGHT = 46;

export default function CommentScroller() {
  const [displayComments, setDisplayComments] = useState<CommnentItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const innerRef = useRef<HTMLDivElement>(null);

  // 初始化：添加克隆节点
  useEffect(() => {
    const looped = [...comments, ...comments.slice(0, VISIBLE_COUNT)];
    setDisplayComments(looped);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prevOffset => {
        const nextOffset = prevOffset + 1;
        setIsTransitioning(true);

        // 如果到达克隆节点，准备重置
        if (nextOffset === comments.length) {
          setTimeout(() => {
            if (innerRef.current) {
              setIsTransitioning(false); // 关闭动画
              setOffset(0); // 回到真实第一条
            }
          }, 500); // 和 CSS transition 时间一致
        }

        return nextOffset;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const translateY = -offset * ITEM_HEIGHT;

  return (
    <div className='comment-outer'>
      <div
        className='comment-inner'
        ref={innerRef}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
        }}
      >
        {displayComments.map((comment, i) => (
          <div className='comment-item' key={`${i}-${comment.name}`}>
            <img src={comment.avatar} className='avatar' />
            <div>
              <p className='name'>{comment.name}</p>
              <p className='desc'>拼课报名成功</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
