import { getAppId } from '@/services';
import { useCheckPublish } from '@/utils/checkPubulish';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';

const WatermarkDiv = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
  z-index: 1;
  pointer-events: none;
  background-size: 100% auto;
  background-repeat: repeat-y;

  &.jiantie {
    opacity: 0.5;
  }

  .slogan {
    position: absolute;
    bottom: 48px;
    right: 0;
    width: 60%;

    &.maka {
      opacity: 0.2;
      transform: translateX(-30%);
    }
  }
`;

const WatermarkVerticalVersion: Record<string, string> = {
  jiantie:
    'https://res.maka.im/cdn/webstore10/jiantie/editor_watermark.png?v=1',
  avite: 'https://res.maka.im/cdn/webstore10/jiantie/editor_watermark.png?v=1',
  xueji: '',
  huiyao: '',
  maka: 'https://img2.maka.im/cdn/mk-widgets/sdk/canvas-watermark.svg',
};

const slogan: Record<string, string> = {
  jiantie: '',
  xueji: '',
  huiyao: '',
  maka: 'https://img2.maka.im/cdn/mk-widgets/sdk/watermark_web_mark.png',
};

interface Props {
  worksId: string;
}

const Watermark = (props: Props) => {
  const { worksId } = props;
  const appid = getAppId();
  const { canExportWithoutWatermark } = useCheckPublish();

  const [showWatermark, setShowWatermark] = useState(false);

  useEffect(() => {
    canExportWithoutWatermark(worksId).then(res => {
      setShowWatermark(!res);
    });
  }, []);

  if (!showWatermark) {
    return null;
  }

  const watermarkVersion = WatermarkVerticalVersion[appid];
  const sloganVersion = slogan[appid];

  return (
    <WatermarkDiv
      className={`watermark ${appid} `}
      style={{
        top: 44,
        backgroundImage: `url("${watermarkVersion}")`,
        display: 'block',
      }}
    >
      <img src={sloganVersion} className={`slogan ${appid}`} alt='' />
    </WatermarkDiv>
  );
};

export default Watermark;
