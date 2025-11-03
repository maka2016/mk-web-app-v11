import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';

const StyledDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff;
  font-family: PingFang SC;
  font-weight: 600;
  font-size: 10px;
  line-height: 12px;
`;

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
    <StyledDiv>
      <Icon name='time' size={12} />
      <span>剩余</span>
      <span>
        {String(time.hour).padStart(2, '0')}h{String(time.min).padStart(2, '0')}
        m
      </span>
    </StyledDiv>
  );
};

export default Countdown;
