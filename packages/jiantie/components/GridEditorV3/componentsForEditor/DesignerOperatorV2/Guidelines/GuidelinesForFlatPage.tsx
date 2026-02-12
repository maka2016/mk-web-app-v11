import React from 'react';
import styled from '@emotion/styled';

const GuidelinesRoot = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  .line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: auto;
    &:after {
      background-image: linear-gradient(
        90deg,
        #3c3c3c 0,
        #ffffff 50%,
        transparent 0
      );
      background-size: 10px 1px;
      content: '';
      height: 2px;
      left: 0;
      bottom: 0;
      position: absolute;
      width: 100%;
    }
    .label {
      position: absolute;
      bottom: 0;
      left: 0;
      z-index: 1000;
      background-color: #fff;
      padding: 0 10px;
      font-size: 12px;
      color: #3c3c3c;
      border-radius: 4px;
      /* transform: translateY(100%); */
      transform: translate(-105%, 100%);
    }
  }
`;

const GuidelinesForFlatPage = () => {
  const coverAspectRatio = '171 / 251';
  const iphoneSe = '375 / 667';
  const iphonePlus = '375 / 768';

  return (
    <GuidelinesRoot id='Guidelines'>
      <div
        className='line cover_line'
        style={{ aspectRatio: coverAspectRatio }}
      >
        <span className='label'>封面（375*550）</span>
      </div>
      {/* <div
        className="line mobile_preview_line"
        style={{
          aspectRatio: iphoneSe,
          top: -100, // 手机顶部留白
        }}
      >
        <span className="label">iPhone SE(375*667-100)</span>
      </div> */}
      <div
        className='line mobile_preview_line'
        style={{
          aspectRatio: iphonePlus,
          top: -100, // 手机顶部留白
        }}
      >
        <span className='label'>iPhone Plus(375*768-100)</span>
      </div>
    </GuidelinesRoot>
  );
};

export default GuidelinesForFlatPage;
