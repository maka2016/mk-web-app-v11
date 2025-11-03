import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface CountdownProps {
  endDate?: string;
}

const Countdown: React.FC<CountdownProps> = ({ endDate }) => {
  const [time, setTime] = useState({
    hour: 0,
    min: 0,
    sec: 0,
  });

  useEffect(() => {
    if (!endDate) return;

    const calculateTimeLeft = () => {
      const now = dayjs();
      const end = dayjs(endDate);
      const diff = end.diff(now, 'second');

      if (diff <= 0) {
        setTime({ hour: 0, min: 0, sec: 0 });
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTime({
        hour: hours,
        min: minutes,
        sec: seconds,
      });
    };

    // 立即计算一次
    calculateTimeLeft();

    // 每秒更新一次
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className='countdown'>
      <div className='h block'>{String(time.hour).padStart(2, '0')}</div>
      <div className='spe'>:</div>
      <div className='m block'>{String(time.min).padStart(2, '0')}</div>
      <div className='spe'>:</div>
      <div className='s block'>{String(time.sec).padStart(2, '0')}</div>
    </div>
  );
};

export default Countdown;
