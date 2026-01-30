'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'temp_noti_closed';

export default function TempNoti() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const closed = localStorage.getItem(STORAGE_KEY);
    return !closed;
  });

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className='relative px-4 py-2 text-xs text-gray-700 bg-white rounded-lg m-3 mb-0'>
      <div className=''>
        部分用户反馈微信链接打不开，我们已为用户更换新的链接地址，可以重新在网页版扫码或从APP重新分享一次
      </div>
      <button
        onClick={handleClose}
        className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'
        aria-label='关闭公告'
      >
        <X size={16} />
      </button>
    </div>
  );
}
