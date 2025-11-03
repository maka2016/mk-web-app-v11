import styled from '@emotion/styled';

const WatermarkDiv = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
  z-index: 999997;
  pointer-events: none;
  background-size: 100% auto;
  background-repeat: repeat-y;

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

const WatermarkHorizontalVersion: Record<string, string> = {
  jiantie: 'https://res.maka.im/cdn/webstore10/jiantie/水印横版.png?v=1',
  xueji: 'https://res.maka.im/cdn/webstore10/xueji/水印横版.png?v=1',
  huiyao: '',
  maka: 'https://img2.maka.im/cdn/mk-widgets/sdk/canvas-watermark.svg',
};

const WatermarkVerticalVersion: Record<string, string> = {
  jiantie: 'https://res.maka.im/cdn/webstore10/jiantie/水印竖版.png?v=1',
  xueji: 'https://res.maka.im/cdn/webstore10/xueji/水印竖版.png?v=1',
  huiyao: '',
  maka: 'https://img2.maka.im/cdn/mk-widgets/sdk/canvas-watermark.svg',
};

const slogan: Record<string, string> = {
  jiantie: 'https://res.maka.im/cdn/webstore10/jiantie/slogan.png?v=1',
  xueji: 'https://res.maka.im/cdn/webstore10/xueji/slogan.png?v=1',
  huiyao: '',
  maka: 'https://img2.maka.im/cdn/mk-widgets/sdk/watermark_web_mark.png',
};

const Watermark = (props: { visible: boolean; query: any }) => {
  const { visible, query } = props;

  const { appid } = query;

  if (!visible) {
    return null;
  }

  const watermarkVersion = WatermarkVerticalVersion[appid];
  const sloganVersion = slogan[appid];

  return (
    <WatermarkDiv
      className='watermark'
      style={{
        backgroundImage: `url("${watermarkVersion}")`,
        display: props.visible ? 'block' : 'none',
      }}
    >
      <img src={sloganVersion} className={`slogan ${appid}`} />
    </WatermarkDiv>
  );
};

export default Watermark;
