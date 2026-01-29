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
  .line_content {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .line {
    width: 100%;
    height: auto;
    min-height: 100px;
    position: relative;
    &:before {
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
      top: 0;
      position: absolute;
      width: 100%;
    }
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
      z-index: 111;
      background-color: #fff;
      /* width: 100%; */
      text-align: center;
      padding: 0 10px;
      font-size: 12px;
      color: #3c3c3c;
      border-radius: 4px;
      margin: 4px;
      transform: translateX(-110%);
      &.top {
        top: 0;
      }
      &.bottom {
        bottom: 0;
      }
    }
  }
`;

const GuidelinesForFlipPage = () => {
  const coverAspectRatio = '171 / 251';
  const iphoneSe = '375 / 667';
  const iphonePlus = '375 / 768';

  return (
    <GuidelinesRoot id='Guidelines'>
      <div className='line_content'>
        <div
          className='line cover_line'
          style={{ aspectRatio: coverAspectRatio }}
        >
          <span className='label top'>封面(375*550)</span>
          <span className='label bottom'>封面(375*550)</span>
        </div>
      </div>
      <div className='line_content'>
        <div
          className='line mobile_preview_line'
          style={{
            aspectRatio: iphoneSe,
          }}
        >
          <span className='label top'>iPhone SE(375*667)</span>
          <span className='label bottom'>iPhone SE(375*667)</span>
        </div>
      </div>
    </GuidelinesRoot>
  );
};

export default GuidelinesForFlipPage;
